import React from 'react';
import { Toast } from '../../../types/ui';
import styles from './ToastContainer.module.css';

interface ToastContainerProps {
  toasts: Toast[];
  onHide: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onHide }) => {
  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.toastContent}>
            <div className={styles.toastIcon}>
              {toast.type === 'success' && '✅'}
              {toast.type === 'error' && '❌'}
              {toast.type === 'warning' && '⚠️'}
              {toast.type === 'info' && 'ℹ️'}
            </div>
            <div className={styles.toastMessage}>{toast.message}</div>
            <button
              className={styles.toastClose}
              onClick={() => onHide(toast.id)}
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
