import React from 'react';
import { BadgeProps } from '../../../types/ui';
import styles from './Badge.module.css';

export const Badge: React.FC<BadgeProps> = ({
  status,
  tone,
  children,
  className = '',
  ...props
}) => {
  const badgeClasses = [
    styles.badge,
    status && styles[status],
    tone && styles[tone],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};
