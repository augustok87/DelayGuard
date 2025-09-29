import React, { memo } from 'react';
import { CardProps } from '../../../types';
import styles from './Card.module.css';

const CardComponent: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  className = '',
  loading = false
}) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || subtitle || actions) && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

// Memoized version with custom comparison
export const Card = memo(CardComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.loading === nextProps.loading &&
    prevProps.className === nextProps.className &&
    // For actions, we do a shallow comparison
    JSON.stringify(prevProps.actions) === JSON.stringify(nextProps.actions)
  );
});

Card.displayName = 'Card';
