import React, { memo } from 'react';
import { ButtonProps } from '../../../types';
import styles from './Button.module.css';

const ButtonComponent: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    loading && styles.loading,
    disabled && styles.disabled,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span className={loading ? styles.hidden : ''}>{children}</span>
    </button>
  );
};

// Memoized version with custom comparison
export const Button = memo(ButtonComponent, (prevProps, nextProps) => {
  return (
    prevProps.variant === nextProps.variant &&
    prevProps.size === nextProps.size &&
    prevProps.loading === nextProps.loading &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.className === nextProps.className &&
    prevProps.type === nextProps.type &&
    prevProps.children === nextProps.children
    // Note: onClick function reference changes will still cause re-renders
    // This is intentional for button interactions
  );
});

Button.displayName = 'Button';
