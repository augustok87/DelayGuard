import React, { memo, useMemo, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { DelayAlert } from '../../../types';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  alert: DelayAlert;
  onAction: (alertId: string, action: 'resolve' | 'dismiss') => void;
  variant: 'active' | 'resolved' | 'dismissed';
}

const AlertCardComponent: React.FC<AlertCardProps> = ({ 
  alert, 
  onAction, 
  variant, 
}) => {
  // Memoize status badge calculation
  const statusBadge = useMemo(() => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'active': { class: styles.badgeDanger, text: 'Active' },
      'resolved': { class: styles.badgeSuccess, text: 'Resolved' },
      'dismissed': { class: styles.badgeInfo, text: 'Dismissed' },
    };
    
    const statusInfo = statusMap[alert.status] || { class: styles.badgeInfo, text: alert.status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  }, [alert.status]);

  // Memoize priority color calculation
  const priorityColor = useMemo(() => {
    if (alert.delayDays >= 7) return '#dc2626'; // Critical - red
    if (alert.delayDays >= 4) return '#ea580c'; // High - orange
    if (alert.delayDays >= 2) return '#d97706'; // Medium - amber
    return '#059669'; // Low - green
  }, [alert.delayDays]);

  // Memoize formatted date
  const formattedDate = useMemo(() => {
    return new Date(alert.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [alert.createdAt]);

  // Memoize resolved date
  const formattedResolvedDate = useMemo(() => {
    if (!alert.resolvedAt) return null;
    return new Date(alert.resolvedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [alert.resolvedAt]);

  // Memoize days text
  const daysText = useMemo(() => {
    return alert.delayDays === 1 ? '1 day' : `${alert.delayDays} days`;
  }, [alert.delayDays]);

  // Memoize card classes
  const cardClasses = useMemo(() => {
    return `${styles.alertCard} ${styles[variant]}`;
  }, [variant]);

  // Memoize delay info style
  const delayInfoStyle = useMemo(() => ({
    color: priorityColor,
  }), [priorityColor]);

  // Stable callback functions
  const handleResolve = useCallback(() => {
    onAction(alert.id, 'resolve');
  }, [onAction, alert.id]);

  const handleDismiss = useCallback(() => {
    onAction(alert.id, 'dismiss');
  }, [onAction, alert.id]);

  return (
    <div className={cardClasses}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h4 className={styles.orderId}>Order #{alert.orderId}</h4>
          <p className={styles.customerName}>{alert.customerName}</p>
        </div>
        <div className={styles.status}>
          {statusBadge}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.delayInfo}>
          <div className={styles.delayDays} style={delayInfoStyle}>
            {daysText} delay
          </div>
          <div className={styles.createdAt}>
            Created: {formattedDate}
          </div>
          {formattedResolvedDate && (
            <div className={styles.resolvedAt}>
              Resolved: {formattedResolvedDate}
            </div>
          )}
        </div>

        {alert.customerEmail && (
          <div className={styles.contactInfo}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{alert.customerEmail}</span>
          </div>
        )}

        {alert.trackingNumber && (
          <div className={styles.trackingInfo}>
            <span className={styles.label}>Tracking:</span>
            <span className={styles.value}>{alert.trackingNumber}</span>
            {alert.carrierCode && (
              <span className={styles.carrier}>({alert.carrierCode})</span>
            )}
          </div>
        )}
      </div>

      {variant === 'active' && (
        <div className={styles.actions}>
          <Button
            variant="success"
            size="sm"
            onClick={handleResolve}
          >
            Mark Resolved
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
};

// Memoized version with custom comparison
export const AlertCard = memo(AlertCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.alert.id === nextProps.alert.id &&
    prevProps.alert.status === nextProps.alert.status &&
    prevProps.alert.delayDays === nextProps.alert.delayDays &&
    prevProps.alert.customerName === nextProps.alert.customerName &&
    prevProps.alert.customerEmail === nextProps.alert.customerEmail &&
    prevProps.alert.trackingNumber === nextProps.alert.trackingNumber &&
    prevProps.alert.carrierCode === nextProps.alert.carrierCode &&
    prevProps.alert.createdAt === nextProps.alert.createdAt &&
    prevProps.alert.resolvedAt === nextProps.alert.resolvedAt &&
    prevProps.variant === nextProps.variant &&
    // Function reference should be stable (useCallback in parent)
    prevProps.onAction === nextProps.onAction
  );
});

AlertCard.displayName = 'AlertCard';
