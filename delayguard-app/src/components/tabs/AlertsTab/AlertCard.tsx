import React from 'react';
import { Button } from '../../ui/Button';
import { DelayAlert } from '../../../types';
import styles from './AlertCard.module.css';

interface AlertCardProps {
  alert: DelayAlert;
  onAction: (alertId: string, action: 'resolve' | 'dismiss') => void;
  variant: 'active' | 'resolved' | 'dismissed';
}

export function AlertCard({ alert, onAction, variant }: AlertCardProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'active': { class: styles.badgeDanger, text: 'Active' },
      'resolved': { class: styles.badgeSuccess, text: 'Resolved' },
      'dismissed': { class: styles.badgeInfo, text: 'Dismissed' },
    };
    
    const statusInfo = statusMap[status] || { class: styles.badgeInfo, text: status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getPriorityColor = (delayDays: number) => {
    if (delayDays >= 7) return '#dc2626'; // Critical - red
    if (delayDays >= 4) return '#ea580c'; // High - orange
    if (delayDays >= 2) return '#d97706'; // Medium - amber
    return '#059669'; // Low - green
  };
getPriorityColor.displayName = 'getPriorityColor';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
formatDate.displayName = 'formatDate';

  const getDaysText = (days: number) => {
    return days === 1 ? '1 day' : `${days} days`;
  };
getDaysText.displayName = 'getDaysText';

  return (
    <div className={`${styles.alertCard} ${styles[variant]}`}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h4 className={styles.orderId}>Order #{alert.orderId}</h4>
          <p className={styles.customerName}>{alert.customerName}</p>
        </div>
        <div className={styles.status}>
          {getStatusBadge(alert.status)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.delayInfo}>
          <div className={styles.delayDays} style={{ color: getPriorityColor(alert.delayDays) }}>
            {getDaysText(alert.delayDays)} delay
          </div>
          <div className={styles.createdAt}>
            Created: {formatDate(alert.createdAt)}
          </div>
          {alert.resolvedAt && (
            <div className={styles.resolvedAt}>
              Resolved: {formatDate(alert.resolvedAt)}
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
            onClick={() => onAction(alert.id, 'resolve')}
          >
            Mark Resolved
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAction(alert.id, 'dismiss')}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

AlertCard.displayName = 'AlertCard';
