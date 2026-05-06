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
  score: number;
}

export interface Player {
  id: string;
  name: string;
  roomId?: string;
  state: PlayerState;
  totalScore: number;
}

export interface RoomSettings {
  rounds: number;
  timerSeconds: number; // 0 for unlimited
}

export interface GameState {
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
}

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export interface RoomResponse {
  success: boolean;
  roomId?: string;
  error?: string;
  player?: Player;
}

// Typed Socket Events
export interface ServerToClientEvents {
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: (data: { currentRound: number, totalRounds: number, endTime?: number }) => void;
  gameStateUpdated: (players: Player[]) => void; // Send updated states (scoreboards)
  gameOver: (data: { isRoundOver: boolean, winnerId?: string, targetWord: string }) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerName: string, settings: RoomSettings, callback: (response: RoomResponse) => void) => void;
  joinRoom: (roomId: string, playerName: string, callback: (response: RoomResponse) => void) => void;
  submitGuess: (guess: string, callback: (response: { success: boolean, error?: string }) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  player: Player;
}
