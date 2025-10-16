// OrderDetailsModal component for displaying order details
import React from 'react';
import { Modal, Button, Text } from '../../ui';
import { Order } from '../../../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order Details"
      primaryAction={{
        content: 'Close',
        onAction: onClose,
      }}
    >
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Text variant="headingMd" as="h3" style={{ marginBottom: '10px' }}>
            Order Information
          </Text>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Order Number:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{order.orderNumber}</Text>
            </div>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Customer Name:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{order.customerName}</Text>
            </div>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Total Amount:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{order.currency} {order.totalAmount}</Text>
            </div>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Created At:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{new Date(order.createdAt).toLocaleDateString()}</Text>
            </div>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Carrier Code:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{order.carrierCode || 'N/A'}</Text>
            </div>
            <div>
              <Text variant="bodyMd" as="span" style={{ fontWeight: 'bold' }}>Tracking Number:</Text>
              <Text variant="bodyMd" as="span" style={{ marginLeft: '10px' }}>{order.trackingNumber || 'N/A'}</Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
