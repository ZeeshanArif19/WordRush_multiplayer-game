import React from 'react';
import { SocketProvider, useGame } from './contexts/SocketContext';
import { JoinScreen } from './components/screens/JoinScreen';
import { LobbyScreen } from './components/screens/LobbyScreen';
import { GameScreen } from './components/screens/GameScreen';
import './index.css';

// We extract the main content into a sub-component so it can use the 'useGame' hook 
// (which requires being inside the SocketProvider)
const GameApp: React.FC = () => {
  const { status } = useGame();

  // State-based routing
  switch (status) {
    case 'lobby':
    case 'disconnected':
      return <JoinScreen />;
    case 'waiting':
      return <LobbyScreen />;
    case 'playing':
    case 'finished':
      return <GameScreen />;
    default:
      return <JoinScreen />;
  }
};

const App: React.FC = () => {
  return (
    <SocketProvider>
      <div style={{ height: '100vh', width: '100vw' }}>
        <GameApp />
      </div>
    </SocketProvider>
  );
};

export default App;
