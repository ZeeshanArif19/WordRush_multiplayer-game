import React, { useState, useEffect } from 'react';
import { Card } from '../shared/Card';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useGame } from '../../contexts/SocketContext';
import { useToast } from '../shared/Toast';
import { Gamepad2, Users, Trophy, X, Target, Hash, Percent, Loader2 } from 'lucide-react';

const StatsModal: React.FC<{ isOpen: boolean, onClose: () => void, dbId?: string }> = ({ isOpen, onClose, dbId }) => {
  const { socket } = useGame();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'personal'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [personalStats, setPersonalStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    
    if (activeTab === 'leaderboard') {
      socket.emit('getLeaderboard', (res) => {
        if (res.success && res.data) {
          setLeaderboard(res.data);
        }
        setLoading(false);
      });
    } else if (activeTab === 'personal' && dbId) {
      socket.emit('getPersonalStats', dbId, (res) => {
        if (res.success && res.data) {
          setPersonalStats(res.data);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [isOpen, activeTab, dbId, socket]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '25px', position: 'relative', zIndex: 1000 }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy color="var(--warning)" /> Stats & Rankings
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', background: activeTab === 'leaderboard' ? 'var(--primary)' : 'var(--surface-color)', color: activeTab === 'leaderboard' ? 'white' : 'var(--text-main)', transition: 'background 0.2s' }}
          >
            Global Leaderboard
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            disabled={!dbId}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: dbId ? 'pointer' : 'not-allowed', background: activeTab === 'personal' ? 'var(--primary)' : 'var(--surface-color)', color: activeTab === 'personal' ? 'white' : 'var(--text-main)', opacity: dbId ? 1 : 0.5, transition: 'background 0.2s' }}
          >
            Personal Stats
          </button>
        </div>

        {loading ? (
           <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ minHeight: '300px' }}>
            {activeTab === 'leaderboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {leaderboard.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data yet</div> : null}
                {leaderboard.map((entry, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)', width: '20px' }}>#{idx + 1}</span>
                      <span style={{ fontWeight: '500' }}>{entry.username}</span>
                    </div>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{entry.global_score} pts</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'personal' && personalStats && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Trophy size={24} color="var(--primary)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{personalStats.global_score}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Global Score</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Hash size={24} color="var(--success)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{personalStats.matches_played}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Matches Played</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Percent size={24} color="var(--warning)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{personalStats.win_rate}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Win Rate</div>
                </div>
                <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                  <Target size={24} color="var(--danger)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{personalStats.avg_points_per_round}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Pts / Round</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const JoinScreen: React.FC = () => {
  const { socket, isConnected, setStatus, setPlayer, setRoomPlayers, setCurrentRound, setTotalRounds, setRoundEndTime, player } = useGame();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState<'create' | 'join' | 'reconnect' | null>(null);
  const { showToast } = useToast();
  const [rounds, setRounds] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [dbId, setDbId] = useState<string | undefined>(undefined);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('wordle_username');
    const savedDbId = localStorage.getItem('wordle_dbId');
    const savedRoomId = localStorage.getItem('wordle_current_room');
    
    if (savedName) setName(savedName);
    if (savedDbId) setDbId(savedDbId);

    // Check URL for room code (e.g. ?room=O6H4NX)
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setRoomCode(roomFromUrl.toUpperCase());
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Auto-reconnect if we have a saved room and dbId
    if (savedDbId && savedRoomId && isConnected && !player) {
      setLoadingAction('reconnect');
      socket.emit('reconnect', savedRoomId, savedDbId, (response) => {
        setLoadingAction(null);
        if (response.success && response.player && response.gameState) {
          setPlayer(response.player);
          if (response.players) {
            setRoomPlayers(response.players);
          }
          setCurrentRound(response.gameState.currentRound);
          setTotalRounds(response.gameState.totalRounds);
          setRoundEndTime(response.gameState.roundEndTime);
          setStatus(response.gameState.status);
        } else {
          // If reconnect fails (e.g. grace period expired), clear the room from storage
          localStorage.removeItem('wordle_current_room');
        }
      });
    }
  }, [isConnected, player, socket]);

  const handleCreateRoom = () => {
    if (!name.trim()) return setError('Please enter your name');
    setError('');
    setLoadingAction('create');

    socket.emit('createRoom', { name, dbId }, { rounds, timerSeconds }, (response) => {
      setLoadingAction(null);
      if (!response.success) {
        setError(response.error || 'Failed to create room');
        showToast(response.error || 'Failed to create room', 'error');
      } else {
        if (response.player) {
          setPlayer(response.player);
          if (response.player.dbId) {
            localStorage.setItem('wordle_dbId', response.player.dbId);
            localStorage.setItem('wordle_username', name);
            setDbId(response.player.dbId);
          }
          if (response.roomId) {
            localStorage.setItem('wordle_current_room', response.roomId);
          }
        }
        if (response.players) {
          setRoomPlayers(response.players);
        }
        setStatus('waiting');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!roomCode.trim()) return setError('Please enter a room code');
    setError('');
    setLoadingAction('join');

    socket.emit('joinRoom', roomCode, { name, dbId }, (response) => {
      setLoadingAction(null);
      if (!response.success) {
        setError(response.error || 'Failed to join room');
        showToast(response.error || 'Failed to join room', 'error');
      } else {
        if (response.player) {
          setPlayer(response.player);
          if (response.player.dbId) {
            localStorage.setItem('wordle_dbId', response.player.dbId);
            localStorage.setItem('wordle_username', name);
            setDbId(response.player.dbId);
          }
          if (response.roomId) {
            localStorage.setItem('wordle_current_room', response.roomId);
          }
        }
        if (response.players) {
          setRoomPlayers(response.players);
        }
        setStatus('waiting');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center', position: 'relative', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, background: 'linear-gradient(to right, var(--primary), var(--success))', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '8px', whiteSpace: 'nowrap', letterSpacing: '-1px' }}>
          WORDLE RUSH
        </h1>
        <p style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Multiplayer Word Guessing Game</p>
        
        <button 
          onClick={() => setIsStatsOpen(true)}
          style={{ position: 'absolute', top: '10px', left: '-50px', background: 'var(--surface-color)', border: '2px solid var(--border-color)', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Leaderboard & Stats"
        >
          <Trophy size={24} color="var(--warning)" />
        </button>
      </div>

      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} dbId={dbId} />

      <Card>
        {!isConnected && (
          <div style={{ padding: '8px', background: 'var(--danger)', color: 'white', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" />
            Connecting to server...
          </div>
        )}

        {loadingAction === 'reconnect' && (
          <div style={{ padding: '8px', background: 'var(--primary)', color: 'white', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Loader2 size={16} className="animate-spin" />
            Reconnecting to your game...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {dbId && (
            <div style={{ padding: '8px', background: 'var(--success)', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
              Welcome back, {name}!
            </div>
          )}
          <Input 
            label="Your Name" 
            placeholder="e.g. WordMaster99" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isConnected || loadingAction !== null}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: 'var(--bg-color)', borderRadius: '16px', border: '2px solid var(--border-color)' }}>
             <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Rounds</label>
             <div style={{ display: 'flex', gap: '8px' }}>
               {[1, 3, 5].map(r => (
                 <Button key={r} variant={rounds === r ? 'primary' : 'secondary'} onClick={() => setRounds(r)} style={{ flex: 1, padding: '6px' }}>{r}</Button>
               ))}
             </div>
             
             <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '5px' }}>Round Timer</label>
             <div style={{ display: 'flex', gap: '8px' }}>
               {[30, 60, 120].map(t => (
                 <Button key={t} variant={timerSeconds === t ? 'primary' : 'secondary'} onClick={() => setTimerSeconds(t)} style={{ flex: 1, padding: '6px', fontSize: '12px' }}>
                   {t}s
                 </Button>
               ))}
             </div>
          </div>

          <Button 
            onClick={handleCreateRoom} 
            disabled={!isConnected || loadingAction !== null}
            fullWidth
            style={{ marginTop: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loadingAction === 'create' ? <Loader2 size={20} className="animate-spin" /> : <Gamepad2 size={20} />}
            Create New Room
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>
            <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: '2px', background: 'var(--border-color)' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Input 
              placeholder="ROOM CODE" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={!isConnected || loadingAction !== null}
              style={{
                textTransform: 'uppercase',
                textAlign: 'center',
                letterSpacing: '4px',
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--primary)',
                fontFamily: 'monospace',
                border: '2px dashed var(--primary)',
                background: 'rgba(79, 161, 216, 0.05)'
              }}
            />
            <Button 
              variant="secondary" 
              onClick={handleJoinRoom}
              disabled={!isConnected || loadingAction !== null}
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {loadingAction === 'join' ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
              Join
            </Button>
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '14px', textAlign: 'center', marginTop: '10px', fontWeight: 'bold' }}>
              {error}
            </div>
          )}
          
          <style>
            {`
              .animate-spin {
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </Card>
    </div>
  );
};
