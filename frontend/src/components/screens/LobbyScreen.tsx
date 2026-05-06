import React from 'react';
import { Card } from '../shared/Card';
import { useGame } from '../../contexts/SocketContext';
import { Loader2, Copy, Users } from 'lucide-react';

export const LobbyScreen: React.FC = () => {
  const { player, roomPlayers } = useGame();

  const handleCopyCode = () => {
    if (player?.roomId) {
      navigator.clipboard.writeText(player.roomId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Waiting for opponent...</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Room Code:</span>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--primary)' }}>
              {player?.roomId}
            </span>
            <button 
              onClick={handleCopyCode}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}
              title="Copy Room Code"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-muted)' }}>
            <Users size={18} />
            Players ({roomPlayers.length}/2)
          </h3>
          
          {roomPlayers.map((p, index) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: index === 0 ? 'var(--primary)' : 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, fontWeight: 500 }}>
                {p.name} {p.id === player?.id && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '5px' }}>(You)</span>}
              </div>
              {index === 0 && (
                <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>Host</div>
              )}
            </div>
          ))}

          {roomPlayers.length < 2 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 2s linear infinite' }} />
              Waiting for someone to join...
            </div>
          )}
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
