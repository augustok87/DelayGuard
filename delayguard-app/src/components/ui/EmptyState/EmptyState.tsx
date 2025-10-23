/**
 * EmptyState Component
 * Beautiful empty state with illustrations and helpful guidance
 * @version 1.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Title of the empty state */
  title: string;
  /** Description text */
  description: string;
  /** Illustration type */
  illustration?: 'no-alerts' | 'no-orders' | 'no-data' | 'error';
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Optional secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

// Inline SVG illustrations (lightweight, no dependencies)
const NoAlertsIllustration = () => (
  <svg viewBox="0 0 200 200" fill="none" className={styles.illustration}>
    <circle cx="100" cy="100" r="80" fill="var(--dg-success-50)" />
    <path
      d="M70 100l15 15 30-30"
      stroke="var(--dg-success-500)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="100" cy="100" r="60" stroke="var(--dg-success-200)" strokeWidth="3" strokeDasharray="5 5" />
  </svg>
);

const NoOrdersIllustration = () => (
  <svg viewBox="0 0 200 200" fill="none" className={styles.illustration}>
    <rect x="50" y="60" width="100" height="80" rx="8" fill="var(--dg-gray-100)" />
    <rect x="60" y="70" width="80" height="10" rx="2" fill="var(--dg-gray-200)" />
    <rect x="60" y="90" width="60" height="8" rx="2" fill="var(--dg-gray-200)" />
    <rect x="60" y="105" width="70" height="8" rx="2" fill="var(--dg-gray-200)" />
    <circle cx="100" cy="100" r="80" stroke="var(--dg-gray-200)" strokeWidth="2" strokeDasharray="8 8" />
  </svg>
);

const NoDataIllustration = () => (
  <svg viewBox="0 0 200 200" fill="none" className={styles.illustration}>
    <rect x="40" y="40" width="120" height="120" rx="12" fill="var(--dg-gray-50)" stroke="var(--dg-gray-200)" strokeWidth="2" />
    <line x1="60" y1="80" x2="140" y2="80" stroke="var(--dg-gray-300)" strokeWidth="3" strokeLinecap="round" />
    <line x1="60" y1="100" x2="120" y2="100" stroke="var(--dg-gray-300)" strokeWidth="3" strokeLinecap="round" />
    <line x1="60" y1="120" x2="130" y2="120" stroke="var(--dg-gray-300)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const ErrorIllustration = () => (
  <svg viewBox="0 0 200 200" fill="none" className={styles.illustration}>
    <circle cx="100" cy="100" r="80" fill="var(--dg-error-50)" />
    <path
      d="M100 60v40M100 120v5"
      stroke="var(--dg-error-500)"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="100" cy="100" r="60" stroke="var(--dg-error-200)" strokeWidth="3" strokeDasharray="5 5" />
  </svg>
);

const illustrations = {
  'no-alerts': NoAlertsIllustration,
  'no-orders': NoOrdersIllustration,
  'no-data': NoDataIllustration,
  'error': ErrorIllustration,
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const illustrationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * EmptyState component for when no data is available
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   title="No alerts yet"
 *   description="When delays are detected, they'll appear here"
 *   illustration="no-alerts"
 *   action={{ label: "Refresh", onClick: handleRefresh }}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration = 'no-data',
  action,
  secondaryAction,
}) => {
  const IllustrationComponent = illustrations[illustration];

  return (
    <motion.div
      className={styles.container}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={illustrationVariants}>
        <IllustrationComponent />
      </motion.div>

      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

        {(action || secondaryAction) && (
          <div className={styles.actions}>
            {action && (
              <motion.button
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={action.onClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {action.label}
              </motion.button>
            )}
            
            {secondaryAction && (
              <motion.button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={secondaryAction.onClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {secondaryAction.label}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

EmptyState.displayName = 'EmptyState';
