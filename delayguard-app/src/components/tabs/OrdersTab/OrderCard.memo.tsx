import React, { memo, useMemo, useCallback } from 'react';
import { Button } from '../../ui/Button';
import { Order } from '../../../types';
import styles from './OrderCard.module.css';

interface OrderCardProps {
  order: Order;
  onAction: (orderId: string, action: 'track' | 'view') => void;
  variant: 'processing' | 'shipped' | 'delivered';
}

const OrderCardComponent: React.FC<OrderCardProps> = ({ 
  order, 
  onAction, 
  variant, 
}) => {
  // Memoize status badge calculation
  const statusBadge = useMemo(() => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'processing': { class: styles.badgeWarning, text: 'Processing' },
      'shipped': { class: styles.badgeInfo, text: 'Shipped' },
      'delivered': { class: styles.badgeSuccess, text: 'Delivered' },
    };
    
    const statusInfo = statusMap[order.status] || { class: styles.badgeInfo, text: order.status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  }, [order.status]);

  // Memoize formatted date
  const formattedDate = useMemo(() => {
    return new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [order.createdAt]);

  // Memoize card classes
  const cardClasses = useMemo(() => {
    return `${styles.orderCard} ${styles[variant]}`;
  }, [variant]);

  // Memoize amount display
  const amountDisplay = useMemo(() => {
    if (order.totalAmount && order.currency) {
      return `${order.currency} ${order.totalAmount.toFixed(2)}`;
    }
    return 'N/A';
  }, [order.totalAmount, order.currency]);

  // Stable callback functions
  const handleTrack = useCallback(() => {
    onAction(order.id, 'track');
  }, [onAction, order.id]);

  const handleView = useCallback(() => {
    onAction(order.id, 'view');
  }, [onAction, order.id]);

  return (
    <div className={cardClasses}>
      <div className={styles.header}>
        <div className={styles.orderInfo}>
          <h4 className={styles.orderNumber}>{order.orderNumber}</h4>
          <p className={styles.customerName}>{order.customerName}</p>
        </div>
        <div className={styles.status}>
          {statusBadge}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.orderDetails}>
          <div className={styles.createdAt}>
            Created: {formattedDate}
          </div>
          <div className={styles.amount}>
            Amount: {amountDisplay}
          </div>
        </div>

        {order.customerEmail && (
          <div className={styles.contactInfo}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{order.customerEmail}</span>
          </div>
        )}

        {order.trackingNumber && (
          <div className={styles.trackingInfo}>
            <span className={styles.label}>Tracking:</span>
            <span className={styles.value}>{order.trackingNumber}</span>
            {order.carrierCode && (
              <span className={styles.carrier}>({order.carrierCode})</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {order.trackingNumber && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleTrack}
          >
            Track Package
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleView}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

// Memoized version with custom comparison
export const OrderCard = memo(OrderCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.orderNumber === nextProps.order.orderNumber &&
    prevProps.order.customerName === nextProps.order.customerName &&
    prevProps.order.customerEmail === nextProps.order.customerEmail &&
    prevProps.order.trackingNumber === nextProps.order.trackingNumber &&
    prevProps.order.carrierCode === nextProps.order.carrierCode &&
    prevProps.order.createdAt === nextProps.order.createdAt &&
    prevProps.order.totalAmount === nextProps.order.totalAmount &&
    prevProps.order.currency === nextProps.order.currency &&
    prevProps.variant === nextProps.variant &&
    // Function reference should be stable (useCallback in parent)
    prevProps.onAction === nextProps.onAction
  );
});

OrderCard.displayName = 'OrderCard';
