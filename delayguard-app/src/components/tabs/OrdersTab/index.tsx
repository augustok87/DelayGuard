import React, { useState } from 'react';
import { Timer, Truck, CheckCircle2, Package } from 'lucide-react';
import { Card } from '../../ui/Card';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { OrderCard } from './OrderCard';
import { Order } from '../../../types';
import styles from './OrdersTab.module.css';

interface OrdersTabProps {
  orders: Order[];
  loading: boolean;
  onOrderAction: (orderId: string, action: 'track' | 'view') => void;
}

type OrderStatus = 'processing' | 'shipped' | 'delivered';

export function OrdersTab({ orders, loading, onOrderAction }: OrdersTabProps) {
  // Phase C: Order filtering state (default to 'shipped' - most important for merchants)
  const [activeTab, setActiveTab] = useState<OrderStatus>('shipped');

  // Calculate counts for all statuses
  const processingOrders = orders.filter(order => order.status === 'processing');
  const shippedOrders = orders.filter(order => order.status === 'shipped');
  const deliveredOrders = orders.filter(order => order.status === 'delivered');

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
          <div className={styles.emptyStateIcon}>
            <Package size={48} aria-hidden={true} strokeWidth={1.5} />
          </div>
          <h3>No orders found</h3>
          <p>Orders will appear here when they are processed.</p>
        </div>
      </Card>
    );
  }

  // Phase C: Get filtered orders based on active tab
  const getFilteredOrders = (): Order[] => {
    switch (activeTab) {
      case 'processing':
        return processingOrders;
      case 'shipped':
        return shippedOrders;
      case 'delivered':
        return deliveredOrders;
      default:
        return shippedOrders;
    }
  };

  const filteredOrders = getFilteredOrders();

  // Phase C: Get empty state message based on active tab
  const getEmptyStateMessage = () => {
    switch (activeTab) {
      case 'processing':
        return {
          icon: <Timer size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No processing orders',
          subtitle: 'Orders being prepared for shipment will appear here.',
        };
      case 'shipped':
        return {
          icon: <Truck size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No shipped orders',
          subtitle: 'Orders in transit will appear here.',
        };
      case 'delivered':
        return {
          icon: <CheckCircle2 size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No delivered orders',
          subtitle: 'Successfully delivered orders will appear here.',
        };
      default:
        return {
          icon: <Package size={48} aria-hidden={true} strokeWidth={1.5} />,
          title: 'No orders found',
          subtitle: 'Orders will appear here when they are processed.',
        };
    }
  };

  const emptyState = getEmptyStateMessage();

  return (
    <div className={styles.container}>
      {/* Phase C: Segmented Control Filter */}
      <div className={styles.filterBar}>
        <SegmentedControl
          options={[
            { value: 'processing', label: 'Processing', badge: processingOrders.length },
            { value: 'shipped', label: 'Shipped', badge: shippedOrders.length },
            { value: 'delivered', label: 'Delivered', badge: deliveredOrders.length },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value as OrderStatus)}
        />
        <div className={styles.filterSummary}>
          Showing {filteredOrders.length} {activeTab} {filteredOrders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      {/* Filtered Orders */}
      {filteredOrders.length > 0 ? (
        <div className={styles.ordersList}>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={onOrderAction}
              variant={activeTab}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>{emptyState.icon}</div>
          <h3>{emptyState.title}</h3>
          <p>{emptyState.subtitle}</p>
        </div>
      )}
    </div>
  );
}

OrdersTab.displayName = 'OrdersTab';
