import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'critical';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  'aria-label'?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  tone,
  size = 'medium',
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  // Use tone prop if provided, otherwise fall back to variant
  const badgeVariant = tone || variant;
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    fontWeight: '500',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    userSelect: 'none',
    border: 'none',
    outline: 'none',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
    },
    success: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
    critical: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
    info: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: {
      padding: '2px 8px',
      fontSize: '0.75rem',
      lineHeight: '1rem',
    },
    medium: {
      padding: '4px 12px',
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    },
    large: {
      padding: '6px 16px',
      fontSize: '1rem',
      lineHeight: '1.5rem',
    },
  };

  const badgeStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[badgeVariant],
    ...sizeStyles[size],
  };

  return (
    <span
      style={badgeStyles}
      className={className}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </span>
  );
};
