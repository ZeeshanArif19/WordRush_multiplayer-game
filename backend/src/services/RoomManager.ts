import { Player, GameState, PlayerState, WORD_LENGTH, MAX_GUESSES, LetterFeedback, RoomSettings } from '@wordle/shared';
import { evaluateGuess, isWinningGuess, isGameOver, isValidGuessFormat } from './GameEngine';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

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
}

export class RoomManager extends EventEmitter {
  private rooms: Map<string, Room> = new Map();
  private readonly MAX_PLAYERS_PER_ROOM = 2;

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
      score: 0
    };
  }

  public createRoom(socketId: string, playerName: string, settings: RoomSettings): { room: Room, player: Player } {
    const roomId = this.generateRoomId();
    
    const player: Player = {
      id: socketId,
      name: playerName,
      roomId: roomId,
      state: this.createInitialPlayerState(),
      totalScore: 0
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

  public joinRoom(roomId: string, socketId: string, playerName: string): { success: boolean, room?: Room, player?: Player, error?: string } {
    const room = this.rooms.get(roomId);

    if (!room) return { success: false, error: 'Room not found.' };
    if (room.status !== 'waiting') return { success: false, error: 'Game has already started or finished.' };
    if (room.players.size >= this.MAX_PLAYERS_PER_ROOM) return { success: false, error: 'Room is full.' };

    const player: Player = {
      id: socketId,
      name: playerName,
      roomId: roomId,
      state: this.createInitialPlayerState(),
      totalScore: 0
    };

    room.players.set(socketId, player);

    if (room.players.size === this.MAX_PLAYERS_PER_ROOM) {
      this.startRound(roomId);
    }

    return { success: true, room, player };
  }

  public startRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'playing';
    room.targetWord = this.generateTargetWord();

    // Reset player state for the new round
    for (const player of room.players.values()) {
      player.state = this.createInitialPlayerState();
    }

    if (room.timerId) clearTimeout(room.timerId);

    if (room.settings.timerSeconds > 0) {
      room.roundEndTime = Date.now() + (room.settings.timerSeconds * 1000);
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
    this.endRound(roomId);
  }

  private endRound(roomId: string, winnerId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.timerId) {
      clearTimeout(room.timerId);
      room.timerId = undefined;
    }

    // Add round scores to total
    for (const player of room.players.values()) {
      player.totalScore += player.state.score;
    }

    const isLastRound = room.currentRound >= room.settings.rounds;
    if (isLastRound) {
      room.status = 'finished';
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
      player.state.score = (MAX_GUESSES - player.state.attempts + 1) * 10;
      roundEnded = true;
      winnerId = player.id;
    } else if (lost) {
      player.state.isGameOver = true;
      player.state.score = 0;
      
      // Check if ALL players have lost
      const allLost = Array.from(room.players.values()).every(p => p.state.isGameOver && !p.state.hasWon);
      if (allLost) {
        roundEnded = true;
      }
    }

    if (roundEnded) {
      this.endRound(roomId, winnerId);
    } else {
       // just emit state update
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
    room.status = 'finished';
    if (room.timerId) clearTimeout(room.timerId);

    return { roomEmpty: false, remainingPlayers };
  }

  public getPlayersInRoomAsArray(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.players.values()) : [];
  }
}

export const roomManager = new RoomManager();
