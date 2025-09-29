import React from 'react';
import styles from './ErrorAlert.module.css';

interface ErrorAlertProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className={styles.alert}>
      <div className={styles.alertIcon}>⚠️</div>
      <div className={styles.alertContent}>
        <strong>Error:</strong> {error}
      </div>
      <button 
        className={styles.dismissButton}
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
