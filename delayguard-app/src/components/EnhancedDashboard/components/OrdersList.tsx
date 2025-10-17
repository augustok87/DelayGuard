// OrdersList component for displaying orders
import React from 'react';
import { Card, DataTable, Text, Badge } from '../../ui';
import { Order, DataTableRow } from '../../../types';
import { logInfo } from '../../../utils/logger';

interface OrdersListProps {
  orders: Order[];
  onOrderClick?: (order: Order) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({ orders, onOrderClick }) => {
  const handleRowClick = (row: DataTableRow) => {
    if (onOrderClick) {
      onOrderClick(row as Order);
    }
  };
  const columns = [
    {
      key: 'orderNumber',
      title: 'Order #',
      sortable: true,
      width: '120px',
      render: (value: string) => {
        logInfo('Order number value', { value });
        return <Text variant="bodyMd" as="span">{value || 'N/A'}</Text>;
      },
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      width: '150px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value || 'N/A'}</Text>,
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
      render: (value: number, row: DataTableRow) => (
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
      render: (value: string) => <Text variant="bodyMd" as="span">{value || 'N/A'}</Text>,
    },
    {
      key: 'trackingNumber',
      title: 'Tracking',
      sortable: true,
      width: '120px',
      render: (value: string) => <Text variant="bodyMd" as="span">{value || 'N/A'}</Text>,
    },
  ];

  const rows = orders.map(order => {
    logInfo('Order data', { order });
    const row = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      status: order.status,
      carrierCode: order.carrierCode,
      trackingNumber: order.trackingNumber,
      currency: order.currency,
    };
    return row;
  });

  return (
    <Card title="Recent Orders">
      <DataTable
        columns={columns}
        rows={rows}
        sortable
        onSort={() => {}}
        onRowClick={handleRowClick}
      />
    </Card>
  );
};
