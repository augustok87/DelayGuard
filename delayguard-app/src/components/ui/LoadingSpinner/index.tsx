import React from 'react';
import { LoadingSpinnerProps } from '../../../types/ui';
import styles from './LoadingSpinner.module.css';

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Loading...',
  overlay = false,
  className = '',
}) => {
  const spinnerClasses = [
    styles.loadingSpinner,
    styles[size],
    overlay && styles.overlay,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={spinnerClasses}>
      <div className={styles.spinner} aria-hidden="true" />
      {message && (
        <p className={styles.message} role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
};
