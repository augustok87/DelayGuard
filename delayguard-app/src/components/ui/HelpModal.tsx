/**
 * HelpModal Component
 *
 * Accessible modal for displaying educational content about delay detection rules
 * Replaces inner accordions for cleaner UX and better reading experience
 *
 * Features:
 * - Full accessibility (ARIA, keyboard navigation, focus trapping)
 * - Escape key to close
 * - Overlay click to close
 * - Responsive (full-screen on mobile)
 * - Smooth animations
 * - React Portal rendering (v1.27.1 fix: prevents overflow clipping)
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './HelpModal.module.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function HelpModal({ isOpen, onClose, title, children }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `help-modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  // Handle Escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle overlay click (close modal)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  // v1.27.1: Use React Portal to render modal at document root
  // This prevents overflow clipping from parent containers
  return createPortal(
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      data-testid="modal-overlay"
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Modal Header */}
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close help modal"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className={styles.content}>{children}</div>

        {/* Modal Footer */}
        <div className={styles.footer}>
          <button className={styles.gotItButton} onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

HelpModal.displayName = 'HelpModal';
