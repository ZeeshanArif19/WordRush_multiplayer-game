"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomManager = exports.RoomManager = void 0;
const shared_1 = require("@wordle/shared");
const GameEngine_1 = require("./GameEngine");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
// --- DATASET INITIALIZATION ---
let wordList = ["APPLE", "REACT", "GHOST", "TRAIN", "HOUSE"]; // Default fallback
try {
    const csvPath = path_1.default.join(process.cwd(), '../5_letters.csv');
    if (fs_1.default.existsSync(csvPath)) {
        const fileContent = fs_1.default.readFileSync(csvPath, 'utf-8');
        wordList = fileContent.split('\n')
            .map(line => line.replace(/,/g, '').trim().toUpperCase())
            .filter(word => word.length === 5);
        console.log(`[Data] Loaded ${wordList.length} words from dataset.`);
    }
    else {
        console.warn(`[Data] CSV not found at ${csvPath}, using fallback words.`);
    }
}
catch (error) {
    console.error("[Data] Failed to load CSV word list:", error);
}
class RoomManager extends events_1.EventEmitter {
    rooms = new Map();
    MAX_PLAYERS_PER_ROOM = 2;
    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    generateTargetWord() {
        return wordList[Math.floor(Math.random() * wordList.length)];
    }
    createInitialPlayerState() {
        return {
            guesses: [],
            attempts: 0,
            hasWon: false,
            isGameOver: false,
            score: 0
        };
    }
    createRoom(socketId, playerName, settings) {
        const roomId = this.generateRoomId();
        const player = {
            id: socketId,
            name: playerName,
            roomId: roomId,
            state: this.createInitialPlayerState(),
            totalScore: 0
        };
        const room = {
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
    joinRoom(roomId, socketId, playerName) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, error: 'Room not found.' };
        if (room.status !== 'waiting')
            return { success: false, error: 'Game has already started or finished.' };
        if (room.players.size >= this.MAX_PLAYERS_PER_ROOM)
            return { success: false, error: 'Room is full.' };
        const player = {
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
    startRound(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.status = 'playing';
        room.targetWord = this.generateTargetWord();
        // Reset player state for the new round
        for (const player of room.players.values()) {
            player.state = this.createInitialPlayerState();
        }
        if (room.timerId)
            clearTimeout(room.timerId);
        if (room.settings.timerSeconds > 0) {
            room.roundEndTime = Date.now() + (room.settings.timerSeconds * 1000);
            room.timerId = setTimeout(() => {
                this.handleRoundTimeout(roomId);
            }, room.settings.timerSeconds * 1000);
        }
        else {
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
    handleRoundTimeout(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'playing')
            return;
        // Force game over for anyone who hasn't won
        for (const player of room.players.values()) {
            if (!player.state.hasWon) {
                player.state.isGameOver = true;
                player.state.score = 0;
            }
        }
        this.endRound(roomId);
    }
    endRound(roomId, winnerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
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
    processGuess(roomId, socketId, guess) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { success: false, error: 'Room not found' };
        if (room.status !== 'playing') {
            return { success: false, error: 'Game is not currently active' };
        }
        const player = room.players.get(socketId);
        if (!player)
            return { success: false, error: 'Player not in room' };
        if (player.state.isGameOver) {
            return { success: false, error: 'You have already finished playing' };
        }
        if (!(0, GameEngine_1.isValidGuessFormat)(guess, shared_1.WORD_LENGTH)) {
            return { success: false, error: 'Invalid guess format' };
        }
        if (!wordList.includes(guess.toUpperCase())) {
            return { success: false, error: 'Not in word list' };
        }
        // Evaluate
        const feedback = (0, GameEngine_1.evaluateGuess)(guess, room.targetWord);
        player.state.guesses.push(feedback);
        player.state.attempts++;
        // Check Win/Loss
        const won = (0, GameEngine_1.isWinningGuess)(feedback);
        const lost = (0, GameEngine_1.isGameOver)(player.state.attempts, shared_1.MAX_GUESSES);
        let roundEnded = false;
        let winnerId = undefined;
        if (won) {
            player.state.hasWon = true;
            player.state.isGameOver = true;
            player.state.score = (shared_1.MAX_GUESSES - player.state.attempts + 1) * 10;
            roundEnded = true;
            winnerId = player.id;
        }
        else if (lost) {
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
        }
        else {
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
    leaveRoom(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return { roomEmpty: true, remainingPlayers: [] };
        room.players.delete(socketId);
        if (room.players.size === 0) {
            if (room.timerId)
                clearTimeout(room.timerId);
            this.rooms.delete(roomId);
            return { roomEmpty: true, remainingPlayers: [] };
        }
        const remainingPlayers = Array.from(room.players.values());
        room.status = 'finished';
        if (room.timerId)
            clearTimeout(room.timerId);
        return { roomEmpty: false, remainingPlayers };
    }
    getPlayersInRoomAsArray(roomId) {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.players.values()) : [];
    }
}
exports.RoomManager = RoomManager;
exports.roomManager = new RoomManager();
