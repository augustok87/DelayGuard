/**
 * Accordion Component
 *
 * Reusable accordion component with accessibility features:
 * - Keyboard navigation (Enter/Space)
 * - ARIA attributes for screen readers
 * - Smooth animations
 * - Customizable styling
 *
 * Usage:
 * <Accordion title="Section Title">
 *   <p>Content goes here</p>
 * </Accordion>
 */

import React, { useState, useId } from 'react';
import styles from './Accordion.module.css';

export interface AccordionProps {
  /** Accordion header text or element */
  title: React.ReactNode;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Whether accordion is open by default */
  defaultOpen?: boolean;
  /** Custom CSS class for the accordion wrapper */
  className?: string;
  /** Custom ID for the accordion (auto-generated if not provided) */
  id?: string;
}

export function Accordion({
  title,
  children,
  defaultOpen = false,
  className = '',
  id,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const autoId = useId();
  // Sanitize the ID to remove colons and other special characters
  const sanitizedAutoId = autoId.replace(/:/g, '');
  const contentId = id ? `${id}-content` : `accordion-${sanitizedAutoId}-content`;

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    // Only toggle on Enter or Space
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`${styles.accordion} ${className}`}>
      <button
        type="button"
        className={styles.header}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className={styles.title}>{title}</span>
        <span
          className={isOpen ? styles.iconOpen : styles.icon}
          data-testid="accordion-icon"
          aria-hidden="true"
        >
          ▼
        </span>
      </button>
      <div
        id={contentId}
        className={isOpen ? styles.contentOpen : styles.content}
        aria-hidden={!isOpen}
      >
        <div className={styles.contentInner}>{children}</div>
      </div>
    </div>
  );
}

Accordion.displayName = 'Accordion';
