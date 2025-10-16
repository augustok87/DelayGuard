import React, { useEffect, useCallback, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
      
      // Restore focus after closing using requestAnimationFrame
      requestAnimationFrame(() => {
        if (previousActiveElement.current) {
          // Ensure the element is still in the DOM and focusable
          if (document.contains(previousActiveElement.current)) {
            previousActiveElement.current.focus();
          }
          previousActiveElement.current = null;
        }
      });
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle close button click
  const handleCloseClick = useCallback((event: React.MouseEvent) => {
    // Prevent the close button from getting focus
    (event.target as HTMLElement).blur();
    
    onClose();
  }, [onClose]);

  // Focus trap functionality
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || event.key !== 'Tab') return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // If we're on the modal itself, move to first/last focusable element
    if (document.activeElement === modal) {
      event.preventDefault();
      if (event.shiftKey) {
        lastElement?.focus();
      } else {
        firstElement?.focus();
      }
    } else if (event.shiftKey) {
      // Shift+Tab from first element should go to last element
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab from last element should go to first element
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }, [isOpen]);

  // Add/remove escape key listener and focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus the modal when it opens
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape, handleKeyDown]);

  // Handle focus restoration when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      // Restore focus after closing using setTimeout to ensure modal is fully closed
      setTimeout(() => {
        if (previousActiveElement.current) {
          // Ensure the element is still in the DOM and focusable
          if (document.contains(previousActiveElement.current)) {
            previousActiveElement.current.focus();
          }
          previousActiveElement.current = null;
        }
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalClasses = [
    styles.modal,
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.overlay} onClick={handleBackdropClick} data-testid="modal-backdrop">
      <div
        ref={modalRef}
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        data-testid="modal"
        tabIndex={-1}
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
            onClick={handleCloseClick}
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
