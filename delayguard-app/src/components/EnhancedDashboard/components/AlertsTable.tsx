// AlertsTable component for displaying delay alerts
import React from 'react';
import { Card, DataTable, Text, Button, Badge } from '../../ui';
import { DelayAlert } from '../../../types';

interface AlertsTableProps {
  alerts: DelayAlert[];
  onResolve: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  onResolve,
  onDismiss,
}) => {
  if (alerts.length === 0) {
    return (
      <Card title="Delay Alerts">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Text variant="headingMd" as="h3">No alerts found</Text>
          <Text variant="bodyMd" as="p" tone="subdued">
            There are currently no delay alerts to display.
          </Text>
        </div>
      </Card>
    );
  }

  const columns = [
    {
      key: 'orderId',
      title: 'Order ID',
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
      key: 'delayDays',
      title: 'Delay Days',
      sortable: true,
      width: '100px',
      render: (value: number) => (
        <Badge tone={value > 5 ? 'critical' : value > 2 ? 'warning' : 'info'}>
          {value} days
        </Badge>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <Badge tone={value === 'high' ? 'critical' : value === 'medium' ? 'warning' : 'info'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      width: '100px',
      render: (value: string) => (
        <Badge tone={value === 'active' ? 'warning' : 'success'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      width: '150px',
      render: (_: any, row: any) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onResolve(row.id)}
            disabled={row.status === 'resolved'}
          >
            Resolve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDismiss(row.id)}
          >
            Dismiss
          </Button>
        </div>
      ),
    },
  ];

  const rows = alerts.map(alert => ({
    id: alert.id,
    orderId: alert.orderId,
    customerName: alert.customerName,
    delayDays: alert.delayDays,
    priority: alert.priority,
    status: alert.status,
  }));

  return (
    <Card title="Delay Alerts">
      <DataTable
        columns={columns}
        rows={rows}
        sortable
        onSort={() => {}}
      />
    </Card>
  );
};
