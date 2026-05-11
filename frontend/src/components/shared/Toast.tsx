import React, { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const getColor = (type: ToastType) => {
    if (type === 'success') return 'var(--success)';
    if (type === 'error') return 'var(--danger)';
    return 'var(--primary)';
  };

  const getIcon = (type: ToastType) => {
    if (type === 'success') return '✓';
    if (type === 'error') return '✗';
    return 'ℹ';
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed', top: '20px', right: '20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 9999, pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 20px', borderRadius: '12px',
              background: 'var(--surface-color)',
              border: `2px solid ${getColor(toast.type)}`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              animation: 'toastSlideIn 0.3s ease-out',
              fontWeight: 600, fontSize: '14px',
              color: 'var(--text-main)',
              pointerEvents: 'auto'
            }}
          >
            <span style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: getColor(toast.type), color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 'bold', flexShrink: 0
            }}>
              {getIcon(toast.type)}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
