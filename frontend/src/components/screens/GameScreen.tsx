import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../../contexts/SocketContext';
import { WORD_LENGTH, MAX_GUESSES } from '@wordle/shared';
import type { LetterStatus, ChatMessage } from '@wordle/shared';
import { Loader2 } from 'lucide-react';

// --- SUBCOMPONENTS ---

const Cell: React.FC<{ letter?: string, status?: LetterStatus, animate?: boolean, flipDelay?: number }> = ({ letter, status, animate, flipDelay }) => {
  const getBackgroundColor = () => {
    if (status === 'correct') return 'var(--success)';
    if (status === 'present') return 'var(--warning)';
    if (status === 'absent') return 'var(--danger)';
    return 'transparent';
  };

  const getBorderColor = () => {
    if (status) return 'transparent';
    if (letter) return 'var(--text-muted)';
    return 'var(--border-color)';
  };

  return (
    <div 
      className={status ? "cell-flip" : ""}
      style={{
        flex: 1,
        aspectRatio: '1/1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(1rem, 3.5vw, 1.6rem)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        border: `2px solid ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        color: status ? 'white' : 'var(--text-main)',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
        transform: animate ? 'scale(1.05)' : 'scale(1)',
        maxWidth: '56px',
        maxHeight: '56px',
        animationDelay: flipDelay !== undefined ? `${flipDelay}s` : '0s',
        opacity: status ? 0 : 1
      }}>
      {letter}
    </div>
  );
};

const Keyboard: React.FC<{ 
  onKeyPress: (key: string) => void, 
  keyStatuses: Record<string, LetterStatus>,
  disabled: boolean 
}> = ({ onKeyPress, keyStatuses, disabled }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
  ];

  const getKeyColor = (key: string) => {
    const status = keyStatuses[key];
    if (status === 'correct') return 'var(--success)';
    if (status === 'present') return 'var(--warning)';
    if (status === 'absent') return 'var(--danger)';
    return 'var(--surface-color)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '500px', margin: '0 auto', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto', flexShrink: 0 }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
          {row.map(key => (
            <button
              key={key}
              onClick={() => onKeyPress(key)}
              style={{
                background: getKeyColor(key),
                border: 'none',
                borderRadius: '4px',
                color: keyStatuses[key] ? 'white' : 'var(--text-main)',
                fontWeight: 'bold',
                padding: key === 'ENTER' || key === 'BACKSPACE' ? '12px 8px' : '12px 0',
                flex: key === 'ENTER' || key === 'BACKSPACE' ? 1.5 : 1,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'background 0.2s ease'
              }}
            >
              {key === 'BACKSPACE' ? '⌫' : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

const ResultModal: React.FC<{ 
  gameOverData: { isRoundOver: boolean, winnerId?: string, targetWord: string },
  players: any[],
  currentPlayerId?: string
}> = ({ gameOverData, players, currentPlayerId }) => {
  const { socket } = useGame();
  const sortedPlayers = [...players].sort((a, b) => ((b.totalScore || 0) + (b.state.score || 0)) - ((a.totalScore || 0) + (a.state.score || 0)));
  const [countdown, setCountdown] = useState(10);

  // The host is the first player
  const isHost = players.length > 0 && players[0].id === currentPlayerId;

  const handleReturnToLobby = useCallback(() => {
    socket.emit('returnToLobby', (res) => {
      if (!res.success) {
        console.error(res.error);
      }
    });
  }, [socket]);

  useEffect(() => {
    if (gameOverData.isRoundOver) return; // Backend handles next round
    if (countdown <= 0) {
      if (isHost) {
        handleReturnToLobby();
      }
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, gameOverData.isRoundOver, isHost, handleReturnToLobby]);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <h2 style={{ marginBottom: '15px', color: 'var(--text-main)', fontSize: '24px' }}>
          {gameOverData.isRoundOver ? 'Round Over!' : 'Game Over!'}
        </h2>
        
        <h3 style={{ marginBottom: '10px', color: 'var(--text-main)', fontSize: '18px' }}>Leaderboard</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {sortedPlayers.map((p, index) => (
            <div key={p.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: p.id === currentPlayerId ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              border: `1px solid ${p.id === currentPlayerId ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', width: '20px', color: index === 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  #{index + 1}
                </span>
                <span style={{ fontWeight: p.id === currentPlayerId ? 'bold' : 'normal', color: 'var(--text-main)' }}>
                  {p.name} {p.id === currentPlayerId && '(You)'}
                </span>
              </div>
              <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                {(p.totalScore || 0) + (p.state.score || 0)} pts
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>The word was</p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '6px', color: 'var(--primary)', margin: '5px 0' }}>{gameOverData.targetWord}</p>
        </div>
        
        {gameOverData.isRoundOver ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }}>Next round starting shortly...</p>
        ) : (
          <button 
            onClick={() => isHost && handleReturnToLobby()}
            disabled={!isHost}
            style={{
              marginTop: '10px', width: '100%', padding: '14px',
              background: isHost ? 'var(--primary)' : 'var(--surface-color)', color: isHost ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold', cursor: isHost ? 'pointer' : 'not-allowed', transition: 'background 0.2s ease',
              opacity: isHost ? 1 : 0.8
            }}
            onMouseOver={(e) => { if (isHost) e.currentTarget.style.background = 'var(--primary-hover)'; }}
            onMouseOut={(e) => { if (isHost) e.currentTarget.style.background = 'var(--primary)'; }}
          >
            {isHost ? `Return to Lobby (${countdown}s)` : `Waiting for Host... (${countdown}s)`}
          </button>
        )}
      </div>
    </div>
  );
};

// --- RESPONSIVE HOOK ---
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

// --- CHAT PANEL ---

const ChatPanel: React.FC<{
  players: any[],
  currentPlayerId?: string,
  messages: ChatMessage[],
  onSend: (text: string) => void,
  isCollapsed: boolean,
  onToggle: () => void
}> = ({ players, currentPlayerId, messages, onSend, isCollapsed, onToggle }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [unread, setUnread] = useState(0);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track unread messages when collapsed
  useEffect(() => {
    if (isCollapsed && messages.length > prevCountRef.current) {
      setUnread(prev => prev + (messages.length - prevCountRef.current));
    }
    if (!isCollapsed) setUnread(0);
    prevCountRef.current = messages.length;
  }, [messages.length, isCollapsed]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent game keyboard from intercepting
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Collapsed toggle button
  if (isCollapsed) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          ...(isMobile
            ? { bottom: '12px', right: '12px' }
            : { right: '10px', top: '50%', transform: 'translateY(-50%)' }),
          background: 'rgba(42, 36, 30, 0.95)', color: '#fff', border: '2px solid rgba(255,255,255,0.15)',
          borderRadius: isMobile ? '50%' : '8px 0 0 8px',
          padding: isMobile ? '14px' : '10px 6px',
          cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
          writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
          zIndex: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          width: isMobile ? '52px' : 'auto',
          height: isMobile ? '52px' : 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        💬
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: 'var(--danger)', color: '#fff', fontSize: '10px',
            fontWeight: 'bold', borderRadius: '50%', minWidth: '18px',
            height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px'
          }}>{unread}</span>
        )}
      </button>
    );
  }

  const panelContent = (
    <>
      {/* Round Status Header */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: '#FFD93D', fontWeight: 'bold', fontSize: '14px' }}>Round Status</span>
          <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}>
            {isMobile ? '✕' : '—'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {players.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '6px', fontSize: '12px',
              background: 'rgba(255,255,255,0.05)',
              opacity: p.isDisconnected ? 0.4 : 1
            }}>
              <span style={{ color: p.id === currentPlayerId ? '#4FA1D8' : '#ddd', fontWeight: 'bold' }}>{p.name}</span>
              <span style={{ color: p.state?.hasWon ? '#4CAF50' : p.state?.isGameOver ? '#EF476F' : '#FFD93D', fontSize: '10px' }}>
                {p.state?.hasWon ? '✓' : p.state?.isGameOver ? '✗' : '◆'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{p.state?.attempts || 0}/{MAX_GUESSES}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Label */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <span style={{ color: '#4FA1D8', fontWeight: 'bold', fontSize: '14px' }}>Chat</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
            No messages yet...
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ fontSize: '13px', lineHeight: '1.4' }}>
            {msg.isSystem ? (
              <span style={{ color: '#FFD93D', fontStyle: 'italic' }}>{msg.text}</span>
            ) : (
              <>
                <span style={{ color: msg.senderId === currentPlayerId ? '#4FA1D8' : '#ddd', fontWeight: 'bold' }}>{msg.senderName}: </span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '6px', padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, alignItems: 'center' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={200}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
            background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: 'none',
            background: input.trim() ? '#E8772E' : 'rgba(255,255,255,0.1)',
            color: 'white', fontWeight: 'bold', fontSize: '13px', cursor: input.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s'
          }}
        >
          Send
        </button>
      </div>
    </>
  );

  // Mobile: bottom drawer overlay
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div onClick={onToggle} style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', zIndex: 30
        }} />
        {/* Drawer */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, width: '100%', height: '55vh',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(42, 36, 30, 0.98)', borderRadius: '20px 20px 0 0',
          overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)',
          borderBottom: 'none', zIndex: 31,
          animation: 'drawerSlideUp 0.25s ease-out'
        }}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0 0', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px' }} />
          </div>
          {panelContent}
        </div>
        <style>{`
          @keyframes drawerSlideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </>
    );
  }

  // Desktop: sidebar
  return (
    <div style={{
      width: '280px', minWidth: '280px', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(42, 36, 30, 0.95)', borderRadius: '16px',
      overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)'
    }}>
      {panelContent}
    </div>
  );
};


// --- MAIN SCREEN ---

export const GameScreen: React.FC = () => {
  const { socket, player, roomPlayers, gameOverData, currentRound, totalRounds, roundEndTime, chatMessages } = useGame();
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hintData, setHintData] = useState<{ index: number, letter: string } | null>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(window.innerWidth < 768);

  // Clear guess input and hint when a new round starts
  useEffect(() => {
    setCurrentGuess('');
    setHintData(null);
  }, [currentRound]);

  useEffect(() => {
    if (!roundEndTime) {
      setTimeLeft(null);
      return;
    }
    const updateTime = () => {
      const remaining = Math.max(0, Math.floor((roundEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [roundEndTime]);

  const isMyTurn = !player?.state?.isGameOver;

  // Calculate Keyboard Colors
  const keyStatuses: Record<string, LetterStatus> = {};
  player?.state?.guesses.forEach(guessRow => {
    guessRow.forEach(({ letter, status }) => {
      const currentStatus = keyStatuses[letter];
      // Priority: correct > present > absent
      if (status === 'correct') {
        keyStatuses[letter] = 'correct';
      } else if (status === 'present' && currentStatus !== 'correct') {
        keyStatuses[letter] = 'present';
      } else if (status === 'absent' && currentStatus !== 'correct' && currentStatus !== 'present') {
        keyStatuses[letter] = 'absent';
      }
    });
  });

  const discoveredGreens = new Set<number>();
  player?.state?.guesses.forEach(guessRow => {
    guessRow.forEach((feedback, index) => {
      if (feedback.status === 'correct') {
        discoveredGreens.add(index);
      }
    });
  });
  const hasMaxGreens = discoveredGreens.size >= 4;

  const handleRequestHint = () => {
    socket.emit('requestHint', (res) => {
      if (!res.success) {
        showError(res.error || 'Failed to get hint');
      } else if (res.hint) {
        setHintData(res.hint);
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom', (res) => {
      if (!res.success) {
        showError(res.error || 'Failed to leave room');
      }
    });
  };

  const handleKeyPress = useCallback((key: string) => {
    if (!isMyTurn) return;

    if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key === 'ENTER') {
      if (currentGuess.length !== WORD_LENGTH) {
        showError('Not enough letters');
        return;
      }
      
      // Submit
      socket.emit('submitGuess', currentGuess, (res) => {
        if (!res.success) {
          showError(res.error || 'Invalid guess');
        } else {
          setCurrentGuess(''); // Clear on success
        }
      });
    } else if (/^[A-Z]$/.test(key)) {
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess(prev => prev + key);
      }
    }
  }, [currentGuess, isMyTurn, socket]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 2000);
  };

  const handleSendMessage = (text: string) => {
    socket.emit('sendMessage', text, (res) => {
      if (!res.success) {
        showError(res.error || 'Failed to send message');
      }
    });
  };

  // Build the Board Rows
  const pastGuesses = player?.state?.guesses || [];
  const emptyRowsCount = MAX_GUESSES - pastGuesses.length - (isMyTurn ? 1 : 0);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', gap: '10px', padding: '10px', overflow: 'hidden' }}>
      {/* Main Game Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px 10px 10px', overflow: 'hidden', minWidth: 0 }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '20px' }}>Round {currentRound} <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/ {totalRounds}</span></h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleLeaveRoom}
            style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: '20px', padding: '5px 15px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Leave
          </button>
          {timeLeft !== null && (
            <div style={{ color: timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)', fontWeight: 'bold', fontSize: '18px', background: 'var(--surface-color)', padding: '5px 15px', borderRadius: '20px', border: `1px solid ${timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)'}` }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      {/* Hint Section */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', width: '100%', height: '40px', flexShrink: 0 }}>
        {!player?.state?.hasUsedHint && !hintData ? (
          <button 
            onClick={handleRequestHint}
            disabled={!isMyTurn || hasMaxGreens}
            style={{
              padding: '8px 24px',
              background: (!isMyTurn || hasMaxGreens) ? 'var(--surface-color)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontWeight: 'bold',
              cursor: (!isMyTurn || hasMaxGreens) ? 'not-allowed' : 'pointer',
              opacity: (!isMyTurn || hasMaxGreens) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            💡 Use Hint
          </button>
        ) : hintData ? (
          <div style={{ padding: '8px 20px', background: 'var(--surface-color)', border: '2px solid var(--primary)', borderRadius: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Hint:</span>
            {Array(WORD_LENGTH).fill(0).map((_, i) => (
              <span key={i} style={{ width: '20px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: i === hintData.index ? 'var(--success)' : 'var(--text-main)' }}>
                {i === hintData.index ? hintData.letter : '_'}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ padding: '8px 20px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
            {player?.state?.hasWon ? 'You won! Waiting for others...' : 'Waiting for others to finish...'}
          </div>
        )}
      </div>

      {/* The Board Container (Flexes to fill space) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0, width: '100%', overflow: 'hidden', padding: '4px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative', width: '100%', maxWidth: '310px', height: '100%', maxHeight: '390px' }}>
          {errorToast && (
            <div style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-main)', color: 'var(--bg-color)', padding: '6px 14px', borderRadius: '12px', fontWeight: 'bold', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '14px', whiteSpace: 'nowrap' }}>
              {errorToast}
            </div>
          )}

          {/* Past Guesses */}
          {pastGuesses.map((row, i) => (
            <div key={`past-${i}`} style={{ display: 'flex', gap: '5px', flex: 1, minHeight: 0 }}>
              {row.map((feedback, j) => (
                <Cell key={j} letter={feedback.letter} status={feedback.status} flipDelay={j * 0.15} />
              ))}
            </div>
          ))}

          {/* Current Guess Row */}
          {isMyTurn && (
            <div style={{ display: 'flex', gap: '5px', flex: 1, minHeight: 0 }}>
              {Array(WORD_LENGTH).fill(0).map((_, i) => {
                const letter = currentGuess[i];
                return <Cell key={`curr-${i}`} letter={letter} animate={!!letter} />;
              })}
            </div>
          )}

          {/* Empty Rows */}
          {Array(Math.max(0, emptyRowsCount)).fill(0).map((_, i) => (
            <div key={`empty-${i}`} style={{ display: 'flex', gap: '5px', flex: 1, minHeight: 0 }}>
              {Array(WORD_LENGTH).fill(0).map((_, j) => (
                <Cell key={`e-${i}-${j}`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard */}
      <Keyboard onKeyPress={handleKeyPress} keyStatuses={keyStatuses} disabled={!isMyTurn} />

      </div>

      {/* Chat Sidebar */}
      <ChatPanel
        players={roomPlayers}
        currentPlayerId={player?.id}
        messages={chatMessages}
        onSend={handleSendMessage}
        isCollapsed={isChatCollapsed}
        onToggle={() => setIsChatCollapsed(prev => !prev)}
      />

      {/* Result Modal */}
      {gameOverData && (
        <ResultModal gameOverData={gameOverData} players={roomPlayers} currentPlayerId={player?.id} />
      )}

    </div>
  );
};
