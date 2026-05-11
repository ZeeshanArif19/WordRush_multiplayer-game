import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {label && <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</label>}
      <input
        className={className}
        {...props}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'var(--surface-color)',
          border: '2px solid var(--border-color)',
          borderRadius: '12px',
          color: 'var(--text-main)',
          fontSize: '16px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
          ...props.style
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05), 0 0 0 4px rgba(79, 161, 216, 0.2)';
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
          if (props.onBlur) props.onBlur(e);
        }}
      />
    </div>
  );
};
