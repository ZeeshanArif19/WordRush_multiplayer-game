import { Player, GameState, PlayerState, WORD_LENGTH, MAX_GUESSES, LetterFeedback, RoomSettings } from '@wordle/shared';
import { evaluateGuess, isWinningGuess, isGameOver, isValidGuessFormat } from './GameEngine';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { db } from '../db';

// --- DATASET INITIALIZATION ---
let wordList: string[] = ["APPLE", "REACT", "GHOST", "TRAIN", "HOUSE"]; // Default fallback
try {
  const csvPath = path.join(process.cwd(), '../5_letters.csv');
  if (fs.existsSync(csvPath)) {
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    wordList = fileContent.split('\n')
      .map(line => line.replace(/,/g, '').trim().toUpperCase())
      .filter(word => word.length === 5);
    console.log(`[Data] Loaded ${wordList.length} words from dataset.`);
  } else {
    console.warn(`[Data] CSV not found at ${csvPath}, using fallback words.`);
  }
} catch (error) {
  console.error("[Data] Failed to load CSV word list:", error);
}

export interface Room {
  id: string;
  players: Map<string, Player>; 
  status: GameState['status'];
  targetWord: string;
  createdAt: number;
  settings: RoomSettings;
  currentRound: number;
  roundEndTime?: number;
  timerId?: NodeJS.Timeout;
  dbRoundId?: string; // Track the current round in the database
  firstWinnerId?: string; // Track the first person to guess correctly
}

export class RoomManager extends EventEmitter {
  private rooms: Map<string, Room> = new Map();
  private disconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_PLAYERS_PER_ROOM = 6;
  private readonly ROOM_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    // Sweep stale rooms every 2 minutes
    setInterval(() => this.cleanupStaleRooms(), 2 * 60 * 1000);
  }

  private cleanupStaleRooms(): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      const isEmpty = room.players.size === 0;
      const isStale = now - room.createdAt > this.ROOM_TTL_MS && room.status !== 'playing';

      if (isEmpty || isStale) {
        if (room.timerId) clearTimeout(room.timerId);
        this.rooms.delete(roomId);
        console.log(`[Cleanup] Removed stale room ${roomId} (empty: ${isEmpty}, stale: ${isStale})`);
      }
    }
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private generateTargetWord(): string {
    return wordList[Math.floor(Math.random() * wordList.length)];
  }

  private createInitialPlayerState(): PlayerState {
    return {
      guesses: [],
      attempts: 0,
      hasWon: false,
      isGameOver: false,
      score: 0,
      hasUsedHint: false
    };
  }

  private async getOrCreateUser(config: { name: string, dbId?: string }): Promise<string | undefined> {
    try {
      if (config.dbId) {
        // Check if user exists by ID
        let res = await db.query('SELECT id FROM users WHERE id = $1', [config.dbId]);
        if (res.rows.length > 0) {
           // Update username in case they changed it
           await db.query('UPDATE users SET username = $1 WHERE id = $2', [config.name, config.dbId]);
           return res.rows[0].id;
        }
      }
      
      // Create user
      let res = await db.query('INSERT INTO users (username) VALUES ($1) RETURNING id', [config.name]);
      return res.rows[0].id;
    } catch (e) {
      console.error("[DB] Failed to get/create user:", e);
      return undefined;
    }
  }

  public async createRoom(socketId: string, playerConfig: { name: string, dbId?: string }, settings: RoomSettings): Promise<{ room: Room, player: Player }> {
    const roomId = this.generateRoomId();
    const dbId = await this.getOrCreateUser(playerConfig);
    
    const player: Player = {
      id: socketId,
      name: playerConfig.name,
      roomId: roomId,
      state: this.createInitialPlayerState(),
      totalScore: 0,
      dbId
    };

    const room: Room = {
      id: roomId,
      players: new Map([[socketId, player]]),
      status: 'waiting',
      targetWord: this.generateTargetWord(),
      createdAt: Date.now(),
      settings,
      currentRound: 1
    };

    this.rooms.set(roomId, room);
    return { room, player };
  }

  public async joinRoom(roomId: string, socketId: string, playerConfig: { name: string, dbId?: string }): Promise<{ success: boolean, room?: Room, player?: Player, isFull?: boolean, error?: string }> {
    const room = this.rooms.get(roomId);

    if (!room) return { success: false, error: 'Room not found.' };
    if (room.status !== 'waiting') return { success: false, error: 'Game has already started or finished.' };
    if (room.players.size >= this.MAX_PLAYERS_PER_ROOM) return { success: false, error: 'Room is full.' };

    const dbId = await this.getOrCreateUser(playerConfig);

    const player: Player = {
      id: socketId,
      name: playerConfig.name,
      roomId: roomId,
      state: this.createInitialPlayerState(),
      totalScore: 0,
      dbId
    };

    room.players.set(socketId, player);

    const isFull = room.players.size === this.MAX_PLAYERS_PER_ROOM;
    return { success: true, room, player, isFull };
  }

  public forceStartGame(roomId: string, socketId: string): { success: boolean, error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.status !== 'waiting') return { success: false, error: 'Game has already started.' };

    // The host is the first player added to the room's players Map
    const hostId = room.players.keys().next().value;
    if (socketId !== hostId) {
      return { success: false, error: 'Only the host can start the game early.' };
    }

    this.startRound(roomId);
    return { success: true };
  }

  public handleDisconnect(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(socketId);
    if (!player) return;

    // If room is in lobby/waiting or finished, just remove immediately — no game state to preserve
    if (room.status !== 'playing') {
      this.leaveRoom(roomId, socketId);
      return;
    }

    // During active game: mark as disconnected and give 30s grace period
    player.isDisconnected = true;
    this.emit('gameStateUpdated', { roomId, players: Array.from(room.players.values()) });

    const timeout = setTimeout(() => {
      this.leaveRoom(roomId, socketId);
      this.disconnectTimeouts.delete(socketId);
    }, 30000);

    this.disconnectTimeouts.set(socketId, timeout);
  }

  public reconnectPlayer(roomId: string, newSocketId: string, dbId: string): { success: boolean, room?: Room, player?: Player, error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };

    // Find player by dbId who is disconnected
    let oldSocketId: string | undefined;
    let targetPlayer: Player | undefined;

    for (const [sid, p] of room.players.entries()) {
      if (p.dbId === dbId && p.isDisconnected) {
        oldSocketId = sid;
        targetPlayer = p;
        break;
      }
    }

    if (!targetPlayer || !oldSocketId) {
      return { success: false, error: 'No matching disconnected player found.' };
    }

    // Cancel the timeout
    const timeout = this.disconnectTimeouts.get(oldSocketId);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectTimeouts.delete(oldSocketId);
    }

    // Replace the old socket ID with the new one
    targetPlayer.id = newSocketId;
    targetPlayer.isDisconnected = false;
    room.players.delete(oldSocketId);
    room.players.set(newSocketId, targetPlayer);

    this.emit('gameStateUpdated', { roomId, players: Array.from(room.players.values()) });

    return { success: true, room, player: targetPlayer };
  }

  public resetRoomToLobby(roomId: string, socketId: string): { success: boolean, error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };

    const hostId = room.players.keys().next().value;
    if (socketId !== hostId) {
      return { success: false, error: 'Only the host can return to the lobby.' };
    }

    room.status = 'waiting';
    room.currentRound = 1;
    room.dbRoundId = undefined;

    for (const player of room.players.values()) {
      player.state = this.createInitialPlayerState();
      player.totalScore = 0;
    }

    this.emit('returnedToLobby', { roomId });
    return { success: true };
  }

  public async startRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'playing';
    room.targetWord = this.generateTargetWord();
    room.firstWinnerId = undefined;

    // Reset player state for the new round
    for (const player of room.players.values()) {
      player.state = this.createInitialPlayerState();
    }

    // Insert Match into DB on first round
    if (room.currentRound === 1) {
      try {
        await db.query(
          'INSERT INTO matches (id, total_rounds, timer_seconds, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [roomId, room.settings.rounds, room.settings.timerSeconds, 'playing']
        );
      } catch (e) { console.error("[DB] Error inserting match:", e); }
    }

    // Insert Round into DB
    try {
      const res = await db.query(
        'INSERT INTO rounds (match_id, round_number, target_word) VALUES ($1, $2, $3) RETURNING id',
        [roomId, room.currentRound, room.targetWord]
      );
      room.dbRoundId = res.rows[0].id;
    } catch (e) { console.error("[DB] Error inserting round:", e); }

    if (room.timerId) clearTimeout(room.timerId);

    if (room.settings.timerSeconds > 0) {
      room.roundEndTime = Date.now() + (Number(room.settings.timerSeconds) * 1000);
      room.timerId = setTimeout(() => {
        this.handleRoundTimeout(roomId);
      }, room.settings.timerSeconds * 1000);
    } else {
      room.roundEndTime = undefined;
    }

    this.emit('roundStarted', {
      roomId,
      currentRound: room.currentRound,
      totalRounds: room.settings.rounds,
      endTime: room.roundEndTime,
      serverTime: Date.now(),
      players: Array.from(room.players.values())
    });
  }

  private handleRoundTimeout(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    // Force game over for anyone who hasn't won
    for (const player of room.players.values()) {
      if (!player.state.hasWon) {
        player.state.isGameOver = true;
        player.state.score = 0;
      }
    }
    this.endRound(roomId, room.firstWinnerId);
  }

  private async endRound(roomId: string, winnerId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.timerId) {
      clearTimeout(room.timerId);
      room.timerId = undefined;
    }

    // Add round scores to total
    for (const player of room.players.values()) {
      player.totalScore += player.state.score;
      player.state.score = 0; // Clear round score after committing it to total
    }

    // Update Round in DB
    const dbWinnerId = winnerId ? room.players.get(winnerId)?.dbId : null;
    if (room.dbRoundId) {
      try {
        await db.query(
          'UPDATE rounds SET ended_at = CURRENT_TIMESTAMP, winner_id = $1 WHERE id = $2',
          [dbWinnerId, room.dbRoundId]
        );
      } catch (e) { console.error("[DB] Error updating round:", e); }
    }

    const isLastRound = room.currentRound >= room.settings.rounds;
    if (isLastRound) {
      room.status = 'finished';

      // Update Match and Players in DB
      try {
        await db.query(
          'UPDATE matches SET status = $1, finished_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['finished', roomId]
        );

        // Calculate Match Winner
        let matchWinnerDbId: string | null = null;
        let maxScore = -1;
        for (const player of room.players.values()) {
          if (player.totalScore > maxScore) {
            maxScore = player.totalScore;
            matchWinnerDbId = player.dbId || null;
          } else if (player.totalScore === maxScore) {
            matchWinnerDbId = null; // Tie
          }
        }

        // Persist Scores
        for (const player of room.players.values()) {
          if (player.dbId) {
            const isMatchWinner = player.dbId === matchWinnerDbId;
            await db.query(
              'INSERT INTO match_players (match_id, user_id, match_score, is_winner) VALUES ($1, $2, $3, $4)',
              [roomId, player.dbId, player.totalScore, isMatchWinner]
            );
            await db.query(
              'UPDATE users SET global_score = global_score + $1 WHERE id = $2',
              [player.totalScore, player.dbId]
            );
          }
        }
      } catch (e) { console.error("[DB] Error saving match results:", e); }
    }

    this.emit('roundEnded', {
      roomId,
      winnerId,
      targetWord: room.targetWord,
      isRoundOver: !isLastRound,
      players: Array.from(room.players.values())
    });

    if (!isLastRound) {
      room.currentRound++;
      // Wait 5 seconds, then start next round
      setTimeout(() => {
        if (this.rooms.has(roomId) && this.rooms.get(roomId)?.status !== 'finished') {
          this.startRound(roomId);
        }
      }, 5000);
    }
  }

  public processGuess(roomId: string, socketId: string, guess: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    
    if (room.status !== 'playing') {
      return { success: false, error: 'Game is not currently active' };
    }

    const player = room.players.get(socketId);
    if (!player) return { success: false, error: 'Player not in room' };

    if (player.state.isGameOver) {
      return { success: false, error: 'You have already finished playing' };
    }

    if (!isValidGuessFormat(guess, WORD_LENGTH)) {
      return { success: false, error: 'Invalid guess format' };
    }

    if (!wordList.includes(guess.toUpperCase())) {
      return { success: false, error: 'Not in word list' };
    }

    // Evaluate
    const feedback = evaluateGuess(guess, room.targetWord);
    player.state.guesses.push(feedback);
    player.state.attempts++;

    // Check Win/Loss
    const won = isWinningGuess(feedback);
    const lost = isGameOver(player.state.attempts, MAX_GUESSES);

    let roundEnded = false;
    let winnerId: string | undefined = undefined;

    if (won) {
      player.state.hasWon = true;
      player.state.isGameOver = true;
      
      // Track the first winner of the round
      if (!room.firstWinnerId) {
        room.firstWinnerId = player.id;
      }
      
      // Calculate Tries Points
      const triesPoints = (7 - player.state.attempts) * 10;
      
      // Calculate Time Points
      let timePoints = 0;
      if (room.settings.timerSeconds > 0 && room.roundEndTime) {
         const totalTimeMs = Number(room.settings.timerSeconds) * 1000;
         const remainingTimeMs = Math.max(0, room.roundEndTime - Date.now());
         const elapsedTimeMs = totalTimeMs - remainingTimeMs;
         const elapsedFraction = elapsedTimeMs / totalTimeMs;
         
         if (elapsedFraction <= 0.25) timePoints = 40;
         else if (elapsedFraction <= 0.50) timePoints = 30;
         else if (elapsedFraction <= 0.75) timePoints = 20;
         else timePoints = 10;
      } else {
         timePoints = 40; // Default to max time points if no timer
      }
      
      const hintPenalty = player.state.hasUsedHint ? 10 : 0;
      player.state.score = Math.max(0, triesPoints + timePoints - hintPenalty);
    } else if (lost) {
      player.state.isGameOver = true;
      player.state.score = 0;
    }

    // Check if ALL players are finished (either won or lost)
    const allFinished = Array.from(room.players.values()).every(p => p.state.isGameOver || p.isDisconnected);
    
    if (allFinished) {
      roundEnded = true;
      winnerId = room.firstWinnerId;
      this.endRound(roomId, winnerId);
    } else {
       // Just emit state update so others see the progress
       this.emit('gameStateUpdated', {
         roomId,
         players: Array.from(room.players.values())
       });
    }

    return { 
      success: true, 
      room, 
      player, 
      feedback,
      roundEnded
    };
  }

  public processHintRequest(roomId: string, socketId: string): { success: boolean, hint?: { index: number, letter: string }, error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found.' };
    if (room.status !== 'playing') return { success: false, error: 'Game is not currently active.' };

    const player = room.players.get(socketId);
    if (!player) return { success: false, error: 'Player not found.' };

    if (player.state.hasUsedHint) {
      return { success: false, error: 'Hint already used this game.' };
    }

    if (player.state.isGameOver) {
      return { success: false, error: 'You cannot use a hint after finishing your round.' };
    }

    // Calculate how many unique greens the player has found
    const discoveredGreens = new Set<number>();
    player.state.guesses.forEach(guessRow => {
      guessRow.forEach((feedback, index) => {
        if (feedback.status === 'correct') {
          discoveredGreens.add(index);
        }
      });
    });

    if (discoveredGreens.size >= 4) {
      return { success: false, error: 'You already have 4 or more greens. Hint unavailable.' };
    }

    // Find an undiscovered index
    const availableIndices = [];
    for (let i = 0; i < room.targetWord.length; i++) {
      if (!discoveredGreens.has(i)) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
       return { success: false, error: 'No letters left to hint.' };
    }

    // Pick a random available index
    const hintIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const hintLetter = room.targetWord[hintIndex];

    // Mark hint as used
    player.state.hasUsedHint = true;

    // Broadcast update so clients know hint was used
    this.emit('gameStateUpdated', { roomId: room.id, players: Array.from(room.players.values()) });

    return { success: true, hint: { index: hintIndex, letter: hintLetter } };
  }

  public leaveRoom(roomId: string, socketId: string): { roomEmpty: boolean, remainingPlayers: Player[] } {
    const room = this.rooms.get(roomId);
    if (!room) return { roomEmpty: true, remainingPlayers: [] };

    room.players.delete(socketId);

    if (room.players.size === 0) {
      if (room.timerId) clearTimeout(room.timerId);
      this.rooms.delete(roomId);
      return { roomEmpty: true, remainingPlayers: [] };
    }

    const remainingPlayers = Array.from(room.players.values());

    if (room.status === 'playing') {
      const allDone = remainingPlayers.every(p => p.state.isGameOver);
      if (allDone) {
        // If everyone left is done, check if someone has won
        const winner = remainingPlayers.find(p => p.state.hasWon);
        this.endRound(roomId, room.firstWinnerId);
      } else {
        // Just emit that the state updated
        this.emit('gameStateUpdated', { roomId, players: remainingPlayers });
      }
    } else {
      // In lobby/finished state, just update
      this.emit('gameStateUpdated', { roomId, players: remainingPlayers });
    }

    return { roomEmpty: false, remainingPlayers };
  }

  public getPlayersInRoomAsArray(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.players.values()) : [];
  }
}

export const roomManager = new RoomManager();
