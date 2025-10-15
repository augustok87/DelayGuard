import React, { useEffect, useCallback } from 'react';
import { ModalProps } from '../../../types/ui';
import styles from './Modal.module.css';

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  primaryAction,
  secondaryActions = [],
  size = 'md',
  className = '',
  ...props
}) => {
  // Handle escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Add/remove escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const modalClasses = [
    styles.modal,
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        {...props}
      >
        <div className={styles.header}>
          {title && (
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          )}
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        <div className={styles.content}>
          {children}
        </div>
        
        {(actions || primaryAction || secondaryActions.length > 0) && (
          <div className={styles.footer}>
            {actions || (
              <div className={styles.actionButtons}>
                {secondaryActions.map((action, index) => (
                  <button
                    key={index}
                    className={`${styles.button} ${styles.secondary}`}
                    onClick={action.onAction}
                    disabled={action.disabled}
                    type="button"
                  >
                    {action.content}
                  </button>
                ))}
                {primaryAction && (
                  <button
                    className={`${styles.button} ${styles.primary}`}
                    onClick={primaryAction.onAction}
                    disabled={primaryAction.disabled}
                    type="button"
                  >
                    {primaryAction.content}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
