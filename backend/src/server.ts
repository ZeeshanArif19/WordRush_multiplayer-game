import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { setupSockets } from './sockets/socketHandler';
import { db } from './db';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '@wordle/shared';

const app = express();

// Security headers
app.use(helmet());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = createServer(app);

// Parse allowed origins from env (comma-separated)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

console.log(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);

// Initialize Socket.IO with strict typings and CORS whitelist
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Delegate socket logic to our handler
setupSockets(io);

const PORT = process.env.PORT || 3001;

// Initialize DB and then start server
db.init().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server due to DB error:', err);
  process.exit(1);
});
