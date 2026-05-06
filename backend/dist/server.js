"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socketHandler_1 = require("./sockets/socketHandler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO with strict typings
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Allow our frontend Vite server to connect
        methods: ["GET", "POST"]
    }
});
// Delegate socket logic to our handler
(0, socketHandler_1.setupSockets)(io);
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
