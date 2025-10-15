// OrdersList component for displaying orders
import React from 'react';
import { Card, DataTable, Text, Badge } from '../../ui';
import { Order } from '../../../types';

interface OrdersListProps {
  orders: Order[];
}

export const OrdersList: React.FC<OrdersListProps> = ({ orders }) => {
  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      width: '120px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value}</Text>,
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      width: '150px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value}</Text>,
    },
    {
      key: 'createdAt',
      title: 'Order Date',
      sortable: true,
      width: '120px',
      render: (value: string) => <Text variant="bodyMd" as="span">{new Date(value).toLocaleDateString()}</Text>,
    },
    {
      key: 'totalAmount',
      title: 'Total Amount',
      sortable: true,
      width: '140px',
      render: (value: number, row: any) => (
        <Text variant="bodyMd" as="span">
          {value ? `$${value.toFixed(2)} ${row.currency || 'USD'}` : 'N/A'}
        </Text>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <Badge tone={value === 'delivered' ? 'success' : value === 'shipped' ? 'info' : 'warning'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'carrierCode',
      title: 'Carrier',
      sortable: true,
      width: '100px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value}</Text>,
    },
    {
      key: 'trackingNumber',
      title: 'Tracking',
      sortable: true,
      width: '120px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value}</Text>,
    },
  ];

  const rows = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    createdAt: order.createdAt,
    totalAmount: order.totalAmount,
    status: order.status,
    carrierCode: order.carrierCode,
    trackingNumber: order.trackingNumber,
    currency: order.currency,
  }));

  return (
    <Card title="Recent Orders">
      <DataTable
        columns={columns}
        rows={rows}
        sortable
        onSort={() => {}}
      />
    </Card>
  );
};
