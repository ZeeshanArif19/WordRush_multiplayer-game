import { Server, Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@wordle/shared';
import { roomManager } from '../services/RoomManager';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

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

    socket.on('createRoom', (playerName, settings, callback) => {
      const { room, player } = roomManager.createRoom(socket.id, playerName, settings);
      socket.data.player = player;
      socket.join(room.id);
      callback({ success: true, roomId: room.id, player });
    });

    socket.on('joinRoom', (roomId, playerName, callback) => {
      const formattedRoomId = roomId.toUpperCase();
      const result = roomManager.joinRoom(formattedRoomId, socket.id, playerName);

      if (!result.success || !result.room || !result.player) {
        callback({ success: false, error: result.error });
        return;
      }

      socket.data.player = result.player;
      socket.join(formattedRoomId);

      socket.to(formattedRoomId).emit('playerJoined', result.player);
      callback({ success: true, roomId: formattedRoomId, player: result.player });
    });

    socket.on('submitGuess', (guess, callback) => {
      const roomId = socket.data.player.roomId;
      if (!roomId) {
        callback({ success: false, error: 'You are not in a room.' });
        return;
      }

      const result = roomManager.processGuess(roomId, socket.id, guess);

      if (!result.success || !result.room) {
        callback({ success: false, error: result.error });
        return;
      }

      // Success! Acknowledge the guess. Events are handled via roomManager emitting globally.
      callback({ success: true });
    });

    socket.on('disconnect', () => {
      console.log(`[-] Client disconnected: ${socket.id}`);
      const roomId = socket.data.player.roomId;
      if (roomId) {
        roomManager.leaveRoom(roomId, socket.id);
        socket.to(roomId).emit('playerLeft', socket.id);
      }
    });
  });
}
