import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../../contexts/SocketContext';
import { WORD_LENGTH, MAX_GUESSES } from '@wordle/shared';
import type { LetterStatus } from '@wordle/shared';

// --- SUBCOMPONENTS ---

const Cell: React.FC<{ letter?: string, status?: LetterStatus, animate?: boolean }> = ({ letter, status, animate }) => {
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
    <div style={{
      width: '60px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      border: `2px solid ${getBorderColor()}`,
      backgroundColor: getBackgroundColor(),
      color: status ? 'white' : 'var(--text-main)',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      transform: animate ? 'scale(1.05)' : 'scale(1)',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '500px', margin: '0 auto', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
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
                padding: key === 'ENTER' || key === 'BACKSPACE' ? '15px 10px' : '15px 0',
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
  const sortedPlayers = [...players].sort((a, b) => ((b.totalScore || 0) + (b.state.score || 0)) - ((a.totalScore || 0) + (a.state.score || 0)));
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (gameOverData.isRoundOver) return; // Backend handles next round
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, gameOverData.isRoundOver]);

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
            onClick={() => window.location.reload()}
            style={{
              marginTop: '10px', width: '100%', padding: '14px',
              background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
          >
            Return to Lobby ({countdown}s)
          </button>
        )}
      </div>
    </div>
  );
};


// --- MAIN SCREEN ---

export const GameScreen: React.FC = () => {
  const { socket, player, roomPlayers, gameOverData, currentRound, totalRounds, roundEndTime } = useGame();
  const [currentGuess, setCurrentGuess] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

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

  // Build the Board Rows
  const pastGuesses = player?.state?.guesses || [];
  const emptyRowsCount = MAX_GUESSES - pastGuesses.length - (isMyTurn ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', height: '100%', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px' }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '20px' }}>Round {currentRound} <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/ {totalRounds}</span></h2>
        {timeLeft !== null && (
          <div style={{ color: timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)', fontWeight: 'bold', fontSize: '18px', background: 'var(--surface-color)', padding: '5px 15px', borderRadius: '20px', border: `1px solid ${timeLeft <= 10 ? 'var(--danger)' : 'var(--primary)'}` }}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Header showing Opponent Status */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', padding: '10px 20px', background: 'var(--surface-color)', borderRadius: '12px' }}>
        {roomPlayers.map(p => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: p.id === player?.id ? 'flex-start' : 'flex-end' }}>
            <span style={{ fontWeight: 'bold', color: p.id === player?.id ? 'var(--primary)' : 'var(--text-main)' }}>
              {p.name} {p.id === player?.id && '(You)'}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Attempts: {p.state?.attempts || 0} / {MAX_GUESSES}
            </span>
            {p.state?.isGameOver && (
              <span style={{ fontSize: '12px', color: p.state.hasWon ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                {p.state.hasWon ? 'WON!' : 'LOST'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* The Board */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px', position: 'relative' }}>
        {errorToast && (
          <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-main)', color: 'var(--bg-color)', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', zIndex: 10 }}>
            {errorToast}
          </div>
        )}

        {/* Past Guesses */}
        {pastGuesses.map((row, i) => (
          <div key={`past-${i}`} style={{ display: 'flex', gap: '8px' }}>
            {row.map((feedback, j) => (
              <Cell key={j} letter={feedback.letter} status={feedback.status} />
            ))}
          </div>
        ))}

        {/* Current Guess Row */}
        {isMyTurn && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {Array(WORD_LENGTH).fill(0).map((_, i) => {
              const letter = currentGuess[i];
              return <Cell key={`curr-${i}`} letter={letter} animate={!!letter} />;
            })}
          </div>
        )}

        {/* Empty Rows */}
        {Array(Math.max(0, emptyRowsCount)).fill(0).map((_, i) => (
          <div key={`empty-${i}`} style={{ display: 'flex', gap: '8px' }}>
            {Array(WORD_LENGTH).fill(0).map((_, j) => (
              <Cell key={`e-${i}-${j}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <Keyboard onKeyPress={handleKeyPress} keyStatuses={keyStatuses} disabled={!isMyTurn} />

      {/* Result Modal */}
      {gameOverData && (
        <ResultModal gameOverData={gameOverData} players={roomPlayers} currentPlayerId={player?.id} />
      )}

    </div>
  );
};
