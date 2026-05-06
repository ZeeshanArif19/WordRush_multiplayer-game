import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupSockets } from './sockets/socketHandler';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@wordle/shared';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with strict typings
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: "*", // Allow our frontend Vite server to connect
    methods: ["GET", "POST"]
  }
});

// Delegate socket logic to our handler
setupSockets(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
