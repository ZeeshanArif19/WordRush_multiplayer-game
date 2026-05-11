import React, { useState, useEffect } from 'react';
import { SocketProvider, useGame } from './contexts/SocketContext';
import { ToastProvider } from './components/shared/Toast';
import { JoinScreen } from './components/screens/JoinScreen';
import { LobbyScreen } from './components/screens/LobbyScreen';
import { GameScreen } from './components/screens/GameScreen';
import { Moon, Sun } from 'lucide-react';
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
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wordle_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('wordle_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('wordle_theme', 'light');
    }
  }, [isDark]);

  return (
    <SocketProvider>
      <ToastProvider>
        <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
          <GameApp />
          <button
            onClick={() => setIsDark(!isDark)}
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '20px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--surface-color)',
              border: '2px solid var(--border-color)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </ToastProvider>
    </SocketProvider>
  );
};

export default App;
