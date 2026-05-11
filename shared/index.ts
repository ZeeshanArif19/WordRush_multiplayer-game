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
  hasUsedHint?: boolean;
}

export interface Player {
  id: string;
  name: string;
  roomId?: string;
  state: PlayerState;
  totalScore: number;
  dbId?: string;
  isDisconnected?: boolean;
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
  players?: Player[];
}

export interface LeaderboardEntry {
  username: string;
  global_score: number;
}

export interface PersonalStats {
  global_score: number;
  matches_played: number;
  matches_won: number;
  win_rate: number;
  avg_points_per_round: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

// Typed Socket Events
export interface ServerToClientEvents {
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: (data: { currentRound: number, totalRounds: number, endTime?: number }) => void;
  gameStateUpdated: (players: Player[]) => void; // Send updated states (scoreboards)
  gameOver: (data: { isRoundOver: boolean, winnerId?: string, targetWord: string }) => void;
  error: (message: string) => void;
  returnedToLobby: () => void;
  leftRoom: () => void;
  chatMessage: (message: ChatMessage) => void;
}

export interface ClientToServerEvents {
  createRoom: (playerConfig: { name: string, dbId?: string }, settings: RoomSettings, callback: (response: RoomResponse) => void) => void;
  joinRoom: (roomId: string, playerConfig: { name: string, dbId?: string }, callback: (response: RoomResponse) => void) => void;
  startGame: (callback: (response: { success: boolean, error?: string }) => void) => void;
  submitGuess: (guess: string, callback: (response: { success: boolean, error?: string }) => void) => void;
  requestHint: (callback: (response: { success: boolean, hint?: { index: number, letter: string }, error?: string }) => void) => void;
  returnToLobby: (callback: (response: { success: boolean, error?: string }) => void) => void;
  leaveRoom: (callback: (response: { success: boolean, error?: string }) => void) => void;
  getLeaderboard: (callback: (response: { success: boolean, data?: LeaderboardEntry[], error?: string }) => void) => void;
  getPersonalStats: (dbId: string, callback: (response: { success: boolean, data?: PersonalStats, error?: string }) => void) => void;
  reconnect: (roomId: string, dbId: string, callback: (response: { success: boolean, player?: Player, players?: Player[], gameState?: { status: 'waiting' | 'playing' | 'finished', currentRound: number, totalRounds: number, roundEndTime?: number }, error?: string }) => void) => void;
  sendMessage: (text: string, callback: (response: { success: boolean, error?: string }) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  player: Player;
}
