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
  style,
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
        padding: '14px 24px',
        borderRadius: '16px',
        background: getBackground(),
        border: variant === 'secondary' ? '2px solid var(--border-color)' : getBorder(),
        color: variant === 'primary' ? 'white' : 'var(--text-main)',
        fontSize: '16px',
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : 'auto',
        transition: 'all 0.1s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: variant === 'primary' ? '0 4px 0 rgba(0,0,0,0.15)' : '0 4px 0 var(--border-color)',
        ...style
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(4px)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = variant === 'primary' ? '0 4px 0 rgba(0,0,0,0.15)' : '0 4px 0 var(--border-color)';
        }
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--primary-hover)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && variant === 'primary') e.currentTarget.style.background = 'var(--primary)';
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = variant === 'primary' ? '0 4px 0 rgba(0,0,0,0.15)' : '0 4px 0 var(--border-color)';
        }
      }}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
