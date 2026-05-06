import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}) => {
  const getBackground = () => {
    if (variant === 'primary') return 'var(--primary)';
    if (variant === 'secondary') return 'var(--surface-color)';
    return 'transparent';
  };

  const getBorder = () => {
    if (variant === 'outline') return '1px solid var(--primary)';
    return '1px solid transparent';
  };

  return (
    <button
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        background: getBackground(),
        border: getBorder(),
        color: 'var(--text-main)',
        fontSize: '16px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--primary-hover)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--primary)';
      }}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
