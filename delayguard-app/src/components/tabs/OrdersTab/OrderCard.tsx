import React from 'react';
import { Button } from '../../ui/Button';
import { Order } from '../../../types';
import styles from './OrderCard.module.css';

interface OrderCardProps {
  order: Order;
  onAction: (orderId: string, action: 'track' | 'view') => void;
  variant: 'processing' | 'shipped' | 'delivered';
}

export function OrderCard({ order, onAction, variant }: OrderCardProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'shipped': { class: styles.badgeInfo, text: 'Shipped' },
      'delivered': { class: styles.badgeSuccess, text: 'Delivered' },
      'processing': { class: styles.badgeWarning, text: 'Processing' }
    };
    
    const statusInfo = statusMap[status] || { class: styles.badgeInfo, text: status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  return (
    <div className={`${styles.orderCard} ${styles[variant]}`}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h4 className={styles.orderNumber}>{order.orderNumber}</h4>
          <p className={styles.customerName}>{order.customerName}</p>
        </div>
        <div className={styles.status}>
          {getStatusBadge(order.status)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.details}>
          <div className={styles.detail}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{order.status}</span>
          </div>
          
          <div className={styles.detail}>
            <span className={styles.label}>Created:</span>
            <span className={styles.value}>{formatDate(order.createdAt)}</span>
          </div>

          {order.totalAmount && (
            <div className={styles.detail}>
              <span className={styles.label}>Total:</span>
              <span className={styles.value}>{formatCurrency(order.totalAmount, order.currency)}</span>
            </div>
          )}
        </div>

        {order.trackingNumber && (
          <div className={styles.trackingInfo}>
            <div className={styles.trackingNumber}>
              <span className={styles.label}>Tracking:</span>
              <span className={styles.value}>{order.trackingNumber}</span>
              {order.carrierCode && (
                <span className={styles.carrier}>({order.carrierCode})</span>
              )}
            </div>
          </div>
        )}

        {order.customerEmail && (
          <div className={styles.contactInfo}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{order.customerEmail}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {order.trackingNumber && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onAction(order.id, 'track')}
          >
            Track Package
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAction(order.id, 'view')}
        >
          View Details
        </Button>
      </div>
    </div>
  );
}
