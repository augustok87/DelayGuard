import React from 'react';
import { ToastProps } from '../../../types/ui';
import styles from './Toast.module.css';

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  className = '',
  ...props
}) => {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const toastClasses = [
    styles.toast,
    styles[type],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={toastClasses} {...props}>
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close toast"
        type="button"
      >
        ×
      </button>
    </div>
  );
};
