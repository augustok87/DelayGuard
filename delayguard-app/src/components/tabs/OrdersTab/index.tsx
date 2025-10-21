import React from 'react';
import { Card } from '../../ui/Card';
import { OrderCard } from './OrderCard';
import { Order } from '../../../types';
import styles from './OrdersTab.module.css';

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onOrderAction: (orderId: string, action: 'track' | 'view') => void;
}

export function OrdersTab({ orders, loading, onOrderAction }: OrdersTabProps) {
  const shippedOrders = orders.filter(order => order.status === 'shipped');
  const deliveredOrders = orders.filter(order => order.status === 'delivered');
  const processingOrders = orders.filter(order => order.status === 'processing');

  if (loading) {
    return (
      <Card title="Recent Orders" subtitle="Loading orders...">
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading orders...</p>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card title="Recent Orders" subtitle="Track and monitor your order fulfillment">
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📦</div>
          <h3>No orders found</h3>
          <p>Orders will appear here when they are processed.</p>
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
          subtitle="Orders being prepared for shipment"
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
          subtitle="Successfully delivered orders"
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
}

OrdersTab.displayName = 'OrdersTab';
