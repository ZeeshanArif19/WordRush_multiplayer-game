import React, { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div style={{
      background: 'var(--surface-color)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      padding: '2rem',
      width: '100%',
      maxWidth: '400px',
      margin: '0 auto'
    }} className={`animate-fade-in ${className}`}>
      {children}
    </div>
  );
};
