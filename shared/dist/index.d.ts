export type LetterStatus = 'correct' | 'present' | 'absent';
export interface LetterFeedback {
    letter: string;
    status: LetterStatus;
}
export interface PlayerState {
    guesses: LetterFeedback[][];
    attempts: number;
    hasWon: boolean;
    isGameOver: boolean;
}
export interface Player {
    id: string;
    name: string;
    roomId?: string;
    state: PlayerState;
}
export interface GameState {
    players: Player[];
    status: 'waiting' | 'playing' | 'finished';
}
export declare const WORD_LENGTH = 5;
export declare const MAX_GUESSES = 6;
export interface RoomResponse {
    success: boolean;
    roomId?: string;
    error?: string;
    player?: Player;
}
export interface ServerToClientEvents {
    playerJoined: (player: Player) => void;
    playerLeft: (playerId: string) => void;
    gameStarted: () => void;
    gameStateUpdated: (players: Player[]) => void;
    gameOver: (data: {
        winnerId?: string;
        targetWord: string;
    }) => void;
    error: (message: string) => void;
}
export interface ClientToServerEvents {
    createRoom: (playerName: string, callback: (response: RoomResponse) => void) => void;
    joinRoom: (roomId: string, playerName: string, callback: (response: RoomResponse) => void) => void;
    submitGuess: (guess: string, callback: (response: {
        success: boolean;
        error?: string;
    }) => void) => void;
}
export interface InterServerEvents {
    ping: () => void;
}
export interface SocketData {
    player: Player;
}
