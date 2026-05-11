import React from 'react';
import { Card } from '../shared/Card';
import { useToast } from '../shared/Toast';
import { useGame } from '../../contexts/SocketContext';
import { Loader2, Copy, Users } from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { player, roomPlayers, socket } = useGame();
  const { showToast } = useToast();

  const handleStartGame = () => {
    socket.emit('startGame', (res) => {
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leaveRoom', (res) => {
      if (!res.success) {
        alert(res.error);
      }
    });
  };

  const handleCopyCode = () => {
    if (player?.roomId) {
      const url = `${window.location.origin}?room=${player.roomId}`;
      navigator.clipboard.writeText(url);
      showToast('Link copied! Share with friends 🔗', 'success');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Waiting for opponent...</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(79, 161, 216, 0.05)', padding: '10px 20px', borderRadius: '12px', border: '2px dashed var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Room Code:</span>
              <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '8px', color: 'var(--primary)', fontFamily: 'monospace' }}>
                {player?.roomId}
              </span>
            </div>
            <button 
              onClick={handleCopyCode}
              style={{ background: 'var(--primary)', border: 'none', color: 'white', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Copy Room Code"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-muted)' }}>
            <Users size={18} />
            Players ({roomPlayers.length}/6)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '5px' }}>
            {roomPlayers.map((p, index) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', background: 'var(--surface-color)', borderRadius: '12px', border: '2px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: index === 0 ? 'var(--warning)' : 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {p.name} {p.id === player?.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(You)</span>}
                  {p.isDisconnected && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239,71,111,0.1)', padding: '2px 6px', borderRadius: '6px' }}>Disconnected</span>}
                </div>
                {index === 0 && (
                  <div style={{ fontSize: '0.8rem', background: 'var(--warning)', color: 'white', padding: '4px 8px', borderRadius: '8px', fontWeight: 'bold' }}>Host</div>
                )}
              </div>
            ))}

            {roomPlayers.length < 6 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '15px', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '2px dashed var(--border-color)' }}>
                <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
                Waiting for players...
              </div>
            )}
          </div>

          {roomPlayers.length > 0 && player?.id === roomPlayers[0].id && (
            <button 
              onClick={handleStartGame}
              style={{
                marginTop: '10px', width: '100%', padding: '14px',
                background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px',
                fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.1s ease',
                boxShadow: '0 4px 0 rgba(0,0,0,0.15)'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = 'none'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.15)'; }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
              onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.15)'; }}
            >
              Start Game Now
            </button>
          )}

          <button 
            onClick={handleLeaveRoom}
            style={{
              marginTop: '5px', width: '100%', padding: '14px',
              background: 'transparent', color: 'var(--danger)', border: '2px solid var(--danger)', borderRadius: '16px',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.1s ease',
              boxShadow: '0 4px 0 var(--border-color)'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 var(--border-color)'; }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 var(--border-color)'; }}
          >
            Leave Room
          </button>
        </div>
      </Card>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
