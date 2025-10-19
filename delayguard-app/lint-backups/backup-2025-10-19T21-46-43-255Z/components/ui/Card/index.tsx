import React from 'react';
import { CardProps } from '../../../types/ui';
import styles from './Card.module.css';

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  loading = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) => {
  const cardClasses = [
    styles.card,
    loading && styles.loading,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      aria-label={ariaLabel}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleSection}>
            {title && <h2 className={styles.cardTitle}>{title}</h2>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
          {actions && (
            <div className={styles.cardActions}>
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className={styles.cardContent}>
        {loading ? (
          <div className={styles.loadingContent}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
