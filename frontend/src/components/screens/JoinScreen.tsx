import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Input } from '../shared/Input';
import { Button } from '../shared/Button';
import { useGame } from '../../contexts/SocketContext';
import { Gamepad2, Users } from 'lucide-react';

export const JoinScreen: React.FC = () => {
  const { socket, isConnected, setStatus, setPlayer } = useGame();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rounds, setRounds] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(60);

  const handleCreateRoom = () => {
    if (!name.trim()) return setError('Please enter your name');
    setError('');
    setIsLoading(true);

    socket.emit('createRoom', name, { rounds, timerSeconds }, (response) => {
      setIsLoading(false);
      if (!response.success) {
        setError(response.error || 'Failed to create room');
      } else {
        if (response.player) setPlayer(response.player);
        setStatus('waiting');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) return setError('Please enter your name');
    if (!roomCode.trim()) return setError('Please enter a room code');
    setError('');
    setIsLoading(true);

    socket.emit('joinRoom', roomCode, name, (response) => {
      setIsLoading(false);
      if (!response.success) {
        setError(response.error || 'Failed to join room');
      } else {
        if (response.player) setPlayer(response.player);
        setStatus('waiting');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary), var(--success))', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '8px' }}>
          WORDLE BATTLE
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Multiplayer Word Guessing Game</p>
      </div>

      <Card>
        {!isConnected && (
          <div style={{ padding: '10px', background: 'var(--danger)', color: 'white', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>
            Connecting to server...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Input 
            label="Your Name" 
            placeholder="e.g. WordMaster99" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isConnected || isLoading}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '15px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
             <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Rounds</label>
             <div style={{ display: 'flex', gap: '8px' }}>
               {[1, 3, 5].map(r => (
                 <Button key={r} variant={rounds === r ? 'primary' : 'secondary'} onClick={() => setRounds(r)} style={{ flex: 1, padding: '8px' }}>{r}</Button>
               ))}
             </div>
             
             <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', marginTop: '10px' }}>Round Timer</label>
             <div style={{ display: 'flex', gap: '8px' }}>
               {[30, 60, 120, 0].map(t => (
                 <Button key={t} variant={timerSeconds === t ? 'primary' : 'secondary'} onClick={() => setTimerSeconds(t)} style={{ flex: 1, padding: '8px', fontSize: '12px' }}>
                   {t === 0 ? 'Off' : `${t}s`}
                 </Button>
               ))}
             </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '5px 0' }} />

          <Button 
            onClick={handleCreateRoom} 
            disabled={!isConnected || isLoading}
            fullWidth
          >
            <Gamepad2 size={20} />
            Create New Room
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Input 
              placeholder="Room Code" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase' }}
              disabled={!isConnected || isLoading}
            />
            <Button 
              variant="secondary" 
              onClick={handleJoinRoom}
              disabled={!isConnected || isLoading}
            >
              <Users size={20} />
              Join
            </Button>
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
              {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
