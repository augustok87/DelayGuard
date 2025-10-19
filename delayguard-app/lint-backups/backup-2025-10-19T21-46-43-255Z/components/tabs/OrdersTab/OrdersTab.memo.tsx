import React, { memo, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { OrderCard } from './OrderCard';
import { Order } from '../../../types';
import styles from './OrdersTab.module.css';

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onOrderAction: (orderId: string, action: 'track' | 'view') => void;
}

const OrdersTabComponent: React.FC<OrdersTabProps> = ({ 
  orders, 
  loading, 
  onOrderAction, 
}) => {
  // Memoize filtered orders to prevent recalculation
  const { processingOrders, shippedOrders, deliveredOrders } = useMemo(() => {
    return {
      processingOrders: orders.filter(order => order.status === 'processing'),
      shippedOrders: orders.filter(order => order.status === 'shipped'),
      deliveredOrders: orders.filter(order => order.status === 'delivered'),
    };
  }, [orders]);

  if (loading) {
    return (
      <Card title="Orders" subtitle="Loading orders...">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading orders...</p>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card title="Orders" subtitle="Track and manage your orders">
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📦</div>
          <h3>No orders found</h3>
          <p>Orders will appear here when they are created.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={styles.container}>
      {/* Processing Orders */}
      {processingOrders.length > 0 && (
        <Card 
          title={`Processing Orders (${processingOrders.length})`}
          subtitle="Orders being prepared"
        >
          <div className={styles.ordersList}>
            {processingOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={onOrderAction}
                variant="processing"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Shipped Orders */}
      {shippedOrders.length > 0 && (
        <Card 
          title={`Shipped Orders (${shippedOrders.length})`}
          subtitle="Orders in transit"
        >
          <div className={styles.ordersList}>
            {shippedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={onOrderAction}
                variant="shipped"
              />
            ))}
          </div>
        </Card>
      )}

      {/* Delivered Orders */}
      {deliveredOrders.length > 0 && (
        <Card 
          title={`Delivered Orders (${deliveredOrders.length})`}
          subtitle="Successfully delivered"
        >
          <div className={styles.ordersList}>
            {deliveredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={onOrderAction}
                variant="delivered"
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Memoized version with custom comparison
export const OrdersTab = memo(OrdersTabComponent, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.orders.length === nextProps.orders.length &&
    // Deep comparison for orders array
    JSON.stringify(prevProps.orders) === JSON.stringify(nextProps.orders) &&
    // Function reference should be stable (useCallback in parent)
    prevProps.onOrderAction === nextProps.onOrderAction
  );
});

OrdersTab.displayName = 'OrdersTab';
