/**
 * Communication Status Badge Component (Phase 1.3)
 *
 * Displays email engagement status for delay alerts.
 *
 * Badge States:
 * - Email sent (✉️ Sent)
 * - Email opened (📧 Opened)
 * - Email clicked (🔗 Clicked)
 * - No email sent (default/no badge)
 *
 * Usage:
 * ```tsx
 * <CommunicationStatusBadge
 *   emailSent={true}
 *   emailOpened={true}
 *   emailOpenedAt={new Date()}
 *   emailClicked={false}
 * />
 * ```
 *
 * Implements IMPLEMENTATION_PLAN.md Phase 1.3 requirements
 */

import React from 'react';
import styles from './CommunicationStatusBadge.module.css';

export interface CommunicationStatusBadgeProps {
  /** Whether an email notification was sent */
  emailSent: boolean;

  /** Whether the email was opened by the customer */
  emailOpened?: boolean;

  /** When the email was opened (optional, for tooltip) */
  emailOpenedAt?: Date | string | null;

  /** Whether a link in the email was clicked */
  emailClicked?: boolean;

  /** When the link was clicked (optional, for tooltip) */
  emailClickedAt?: Date | string | null;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp for tooltip display
 */
function formatTimestamp(timestamp: Date | string | null | undefined): string {
  if (!timestamp) return '';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const CommunicationStatusBadge: React.FC<CommunicationStatusBadgeProps> = ({
  emailSent,
  emailOpened = false,
  emailOpenedAt,
  emailClicked = false,
  emailClickedAt,
  className = '',
}) => {
  // If no email was sent, don't render anything
  if (!emailSent) {
    return null;
  }

  // Determine badge state (highest engagement level wins)
  let badgeIcon = '✉️';
  let badgeText = 'Sent';
  let badgeClass = styles.sent;
  let tooltip = 'Email notification sent to customer';

  if (emailClicked) {
    badgeIcon = '🔗';
    badgeText = 'Clicked';
    badgeClass = styles.clicked;
    tooltip = emailClickedAt
      ? `Customer clicked link at ${formatTimestamp(emailClickedAt)}`
      : 'Customer clicked link in email';
  } else if (emailOpened) {
    badgeIcon = '📧';
    badgeText = 'Opened';
    badgeClass = styles.opened;
    tooltip = emailOpenedAt
      ? `Customer opened email at ${formatTimestamp(emailOpenedAt)}`
      : 'Customer opened the email';
  }

  return (
    <span
      className={`${styles.badge} ${badgeClass} ${className}`}
      title={tooltip}
      role="status"
      aria-label={`Email status: ${badgeText}`}
    >
      <span className={styles.icon} aria-hidden="true">
        {badgeIcon}
      </span>
      <span className={styles.text}>{badgeText}</span>
    </span>
  );
};

CommunicationStatusBadge.displayName = 'CommunicationStatusBadge';
