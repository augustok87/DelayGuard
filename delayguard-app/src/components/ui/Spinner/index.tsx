import React from 'react';
import { LoadingSpinnerProps } from '../../../types/ui';
import styles from './Spinner.module.css';

export const Spinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  overlay = false,
  className = '',
  ...props
}) => {
  const spinnerClasses = [
    styles.spinner,
    styles[size],
    overlay && styles.overlay,
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <div className={spinnerClasses} {...props}>
      <div className={styles.spinnerCircle} />
      {message && <span className={styles.message}>{message}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className={styles.overlayContainer}>
        {content}
      </div>
    );
  }

  return content;
};
