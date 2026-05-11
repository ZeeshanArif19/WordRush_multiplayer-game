import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@wordle/shared';
import { roomManager } from '../services/RoomManager';
import { db } from '../db';
import { RateLimiterMemory } from 'rate-limiter-flexible';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// --- XSS Sanitizer ---
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// --- Rate Limiters ---
// Chat: 3 messages per 5 seconds per socket
const chatLimiter = new RateLimiterMemory({ points: 3, duration: 5 });
// Guesses: 2 per second per socket
const guessLimiter = new RateLimiterMemory({ points: 2, duration: 1 });
// Room creation: 2 per 30 seconds per socket
const createRoomLimiter = new RateLimiterMemory({ points: 2, duration: 30 });
// Room join: 3 per 10 seconds per socket
const joinRoomLimiter = new RateLimiterMemory({ points: 3, duration: 10 });

export function setupSockets(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
  
  // Set up global roomManager listeners ONCE
  roomManager.on('roundStarted', (data) => {
    io.to(data.roomId).emit('gameStarted', {
      currentRound: data.currentRound,
      totalRounds: data.totalRounds,
      endTime: data.endTime
    });
    io.to(data.roomId).emit('gameStateUpdated', data.players);
  });

  roomManager.on('gameStateUpdated', (data) => {
    io.to(data.roomId).emit('gameStateUpdated', data.players);
  });

  roomManager.on('roundEnded', (data) => {
    io.to(data.roomId).emit('gameStateUpdated', data.players);
    io.to(data.roomId).emit('gameOver', {
      isRoundOver: data.isRoundOver,
      winnerId: data.winnerId,
      targetWord: data.targetWord
    });
  });

  roomManager.on('returnedToLobby', (data) => {
    io.to(data.roomId).emit('returnedToLobby');
    // Also broadcast the new state with empty scores
    const players = roomManager.getPlayersInRoomAsArray(data.roomId);
    io.to(data.roomId).emit('gameStateUpdated', players);
  });

  io.on('connection', (socket: GameSocket) => {
    console.log(`[+] Client connected: ${socket.id}`);

    // Provide default socket data
    socket.data.player = {
      id: socket.id,
      name: 'Anonymous',
      state: {
        guesses: [],
        attempts: 0,
        hasWon: false,
        isGameOver: false,
        score: 0
      },
      totalScore: 0
    };

    socket.on('createRoom', async (playerConfig, settings, callback) => {
      try {
        await createRoomLimiter.consume(socket.id);
      } catch { return callback({ success: false, error: 'Too many requests. Please wait.' }); }
      try {
        const sanitizedConfig = { name: sanitize(playerConfig.name.slice(0, 20)), dbId: playerConfig.dbId };
        const { room, player } = await roomManager.createRoom(socket.id, sanitizedConfig, settings);
        socket.data.player = player;
        socket.join(room.id);
        callback({ success: true, roomId: room.id, player, players: Array.from(room.players.values()) });
      } catch (err) {
        console.error('[Socket] Error in createRoom:', err);
        callback({ success: false, error: 'Internal Server Error during room creation.' });
      }
    });

    socket.on('joinRoom', async (roomId, playerConfig, callback) => {
      try {
        await joinRoomLimiter.consume(socket.id);
      } catch { return callback({ success: false, error: 'Too many requests. Please wait.' }); }
      try {
        const formattedRoomId = roomId.toUpperCase();
        const sanitizedConfig = { name: sanitize(playerConfig.name.slice(0, 20)), dbId: playerConfig.dbId };
        const result = await roomManager.joinRoom(formattedRoomId, socket.id, sanitizedConfig);

        if (!result.success || !result.room || !result.player) {
          callback({ success: false, error: result.error });
          return;
        }

        socket.data.player = result.player;
        socket.join(formattedRoomId);

        socket.to(formattedRoomId).emit('playerJoined', result.player);
        // System chat message
        io.to(formattedRoomId).emit('chatMessage', {
          id: `sys-${Date.now()}`,
          senderName: 'System',
          senderId: 'system',
          text: `${result.player.name} joined the room`,
          timestamp: Date.now(),
          isSystem: true
        });
        callback({ success: true, roomId: formattedRoomId, player: result.player, players: Array.from(result.room.players.values()) });

        if (result.isFull) {
          roomManager.startRound(formattedRoomId);
        }
      } catch (err) {
        console.error('[Socket] Error in joinRoom:', err);
        callback({ success: false, error: 'Internal Server Error during room join.' });
      }
    });

    socket.on('startGame', (callback) => {
      try {
        const roomId = socket.data.player?.roomId;
        if (!roomId) {
          return callback({ success: false, error: 'You are not in a room.' });
        }

        const result = roomManager.forceStartGame(roomId, socket.id);
        callback(result);
      } catch (err) {
        console.error('[Socket] Error in startGame:', err);
        callback({ success: false, error: 'Internal Server Error starting game.' });
      }
    });

    socket.on('returnToLobby', (callback) => {
      try {
        const roomId = socket.data.player?.roomId;
        if (!roomId) {
          return callback({ success: false, error: 'You are not in a room.' });
        }

        const result = roomManager.resetRoomToLobby(roomId, socket.id);
        callback(result);
      } catch (err) {
        console.error('[Socket] Error in returnToLobby:', err);
        callback({ success: false, error: 'Internal Server Error returning to lobby.' });
      }
    });

    socket.on('leaveRoom', (callback) => {
      try {
        const roomId = socket.data.player?.roomId;
        if (!roomId) {
          return callback({ success: false, error: 'You are not in a room.' });
        }

        roomManager.leaveRoom(roomId, socket.id);
        socket.leave(roomId);
        socket.to(roomId).emit('playerLeft', socket.id);
        
        if (socket.data.player) {
          socket.data.player.roomId = undefined;
        }
        socket.emit('leftRoom'); 

        callback({ success: true });
      } catch (err) {
        console.error('[Socket] Error in leaveRoom:', err);
        callback({ success: false, error: 'Internal Server Error leaving room.' });
      }
    });

    socket.on('requestHint', (callback) => {
      try {
        const roomId = socket.data.player?.roomId;
        if (!roomId) {
          return callback({ success: false, error: 'You are not in a room.' });
        }
        const result = roomManager.processHintRequest(roomId, socket.id);
        callback(result);
      } catch (err) {
        console.error('[Socket] Error in requestHint:', err);
        callback({ success: false, error: 'Internal Server Error processing hint.' });
      }
    });

    socket.on('getLeaderboard', async (callback) => {
      try {
        const res = await db.query('SELECT username, global_score FROM users ORDER BY global_score DESC LIMIT 10');
        callback({ success: true, data: res.rows });
      } catch (err) {
        console.error('[Socket] Error in getLeaderboard:', err);
        callback({ success: false, error: 'Internal Server Error fetching leaderboard.' });
      }
    });

    socket.on('getPersonalStats', async (dbId, callback) => {
      try {
        if (!dbId) {
          return callback({ success: false, error: 'User ID is required.' });
        }
        
        const userRes = await db.query('SELECT global_score FROM users WHERE id = $1', [dbId]);
        if (userRes.rows.length === 0) {
           return callback({ success: false, error: 'User not found.' });
        }
        const globalScore = userRes.rows[0].global_score;

        const matchesRes = await db.query(`
          SELECT 
            COUNT(mp.match_id) as matches_played,
            SUM(CASE WHEN mp.is_winner THEN 1 ELSE 0 END) as matches_won,
            SUM(m.total_rounds) as total_rounds
          FROM match_players mp
          JOIN matches m ON mp.match_id = m.id
          WHERE mp.user_id = $1
        `, [dbId]);

        const statsRow = matchesRes.rows[0];
        const matchesPlayed = parseInt(statsRow.matches_played) || 0;
        const matchesWon = parseInt(statsRow.matches_won) || 0;
        const totalRounds = parseInt(statsRow.total_rounds) || 0;

        const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
        const avgPointsPerRound = totalRounds > 0 ? Math.round(globalScore / totalRounds) : 0;

        callback({ 
          success: true, 
          data: {
            global_score: globalScore,
            matches_played: matchesPlayed,
            matches_won: matchesWon,
            win_rate: winRate,
            avg_points_per_round: avgPointsPerRound
          }
        });
      } catch (err) {
        console.error('[Socket] Error in getPersonalStats:', err);
        callback({ success: false, error: 'Internal Server Error fetching personal stats.' });
      }
    });

    socket.on('submitGuess', async (guess, callback) => {
      try {
        await guessLimiter.consume(socket.id);
      } catch { return callback({ success: false, error: 'Too fast! Slow down.' }); }
      try {
        const roomId = socket.data.player.roomId;
        if (!roomId) {
          callback({ success: false, error: 'You are not in a room.' });
          return;
        }

        const sanitizedGuess = guess.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
        const result = roomManager.processGuess(roomId, socket.id, sanitizedGuess);

        if (!result.success || !result.room) {
          callback({ success: false, error: result.error });
          return;
        }

        // Success! Acknowledge the guess. Events are handled via roomManager emitting globally.
        callback({ success: true });
      } catch (err) {
        console.error('[Socket] Error in submitGuess:', err);
        callback({ success: false, error: 'Internal Server Error processing guess.' });
      }
    });

    socket.on('reconnect', (roomId, dbId, callback) => {
      try {
        const result = roomManager.reconnectPlayer(roomId, socket.id, dbId);
        if (!result.success || !result.room || !result.player) {
          return callback({ success: false, error: result.error || 'Failed to reconnect.' });
        }

        socket.join(roomId);
        socket.data.player = result.player;

        callback({ 
          success: true, 
          player: result.player, 
          players: Array.from(result.room.players.values()),
          gameState: {
            status: result.room.status,
            currentRound: result.room.currentRound,
            totalRounds: result.room.settings.rounds,
            roundEndTime: result.room.roundEndTime
          }
        });
      } catch (err) {
        console.error('[Socket] Error in reconnect:', err);
        callback({ success: false, error: 'Internal Server Error during reconnect.' });
      }
    });

    socket.on('sendMessage', async (text, callback) => {
      try {
        await chatLimiter.consume(socket.id);
      } catch { return callback({ success: false, error: 'Slow down! You are sending messages too fast.' }); }
      try {
        const roomId = socket.data.player?.roomId;
        const playerName = socket.data.player?.name;
        if (!roomId || !playerName) {
          return callback({ success: false, error: 'You are not in a room.' });
        }

        const trimmed = text.trim();
        if (!trimmed || trimmed.length > 200) {
          return callback({ success: false, error: 'Invalid message.' });
        }

        const message = {
          id: `${socket.id}-${Date.now()}`,
          senderName: sanitize(playerName),
          senderId: socket.id,
          text: sanitize(trimmed),
          timestamp: Date.now()
        };

        io.to(roomId).emit('chatMessage', message);
        callback({ success: true });
      } catch (err) {
        console.error('[Socket] Error in sendMessage:', err);
        callback({ success: false, error: 'Failed to send message.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[-] Client disconnected: ${socket.id}`);
      const roomId = socket.data.player?.roomId;
      if (roomId) {
        // Send system message before handling disconnect
        const playerName = socket.data.player?.name;
        if (playerName) {
          io.to(roomId).emit('chatMessage', {
            id: `sys-${Date.now()}`,
            senderName: 'System',
            senderId: 'system',
            text: `${playerName} disconnected`,
            timestamp: Date.now(),
            isSystem: true
          });
        }
        roomManager.handleDisconnect(roomId, socket.id);
      }
    });
  });
}
