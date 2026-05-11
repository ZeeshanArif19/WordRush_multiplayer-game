import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, Player, ChatMessage } from '@wordle/shared';

// Create a typed socket instance pointing to our backend
// Use VITE_API_URL in production, fallback to localhost for dev
const URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL as string, {
  autoConnect: false // We connect manually when needed
});

interface SocketContextType {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  isConnected: boolean;
  player: Player | null;
  roomPlayers: Player[];
  status: 'disconnected' | 'lobby' | 'waiting' | 'playing' | 'finished';
  gameOverData: { isRoundOver: boolean, winnerId?: string, targetWord: string } | null;
  currentRound: number;
  totalRounds: number;
  roundEndTime?: number;
  setPlayer: (p: Player) => void;
  setRoomPlayers: (players: Player[]) => void;
  setStatus: (s: SocketContextType['status']) => void;
  setCurrentRound: (r: number) => void;
  setTotalRounds: (r: number) => void;
  setRoundEndTime: (t: number | undefined) => void;
  chatMessages: ChatMessage[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [roomPlayers, setRoomPlayers] = useState<Player[]>([]);
  const [status, setStatus] = useState<SocketContextType['status']>('disconnected');
  const [gameOverData, setGameOverData] = useState<{ isRoundOver: boolean, winnerId?: string, targetWord: string } | null>(null);
  
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(1);
  const [roundEndTime, setRoundEndTime] = useState<number | undefined>(undefined);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('lobby');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setStatus('disconnected');
    });

    socket.on('playerJoined', (newPlayer) => {
      setRoomPlayers(prev => [...prev, newPlayer]);
    });

    socket.on('playerLeft', (playerId) => {
      setRoomPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    socket.on('gameStarted', (data) => {
      setCurrentRound(data.currentRound);
      setTotalRounds(data.totalRounds);
      setRoundEndTime(data.endTime);
      setGameOverData(null);
      setStatus('playing');
    });

    socket.on('gameStateUpdated', (players) => {
      setRoomPlayers(players);
      setPlayer(prevPlayer => {
        if (!prevPlayer) return null;
        const updatedMe = players.find(p => p.id === prevPlayer.id);
        return updatedMe || prevPlayer;
      });
    });

    socket.on('gameOver', (data) => {
      setGameOverData(data);
      setStatus('finished');
    });

    socket.on('returnedToLobby', () => {
      setStatus('waiting');
      setGameOverData(null);
      setCurrentRound(1);
    });

    socket.on('leftRoom', () => {
      setStatus('connected');
      setPlayer(null);
      setRoomPlayers([]);
      setGameOverData(null);
      setCurrentRound(1);
      setChatMessages([]);
      localStorage.removeItem('wordle_current_room');
    });

    socket.on('chatMessage', (message) => {
      setChatMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
    });

    return () => {
      socket.disconnect();
      socket.removeAllListeners();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, player, roomPlayers, status, gameOverData, currentRound, totalRounds, roundEndTime, setPlayer, setRoomPlayers, setStatus, setCurrentRound, setTotalRounds, setRoundEndTime, chatMessages }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useGame must be used within a SocketProvider');
  }
  return context;
};
