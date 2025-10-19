// AlertsTable component for displaying delay alerts
import React, { useState } from 'react';
import { Card, DataTable, Text, Button, Badge } from '../../ui';
import { DelayAlert, DataTableRow } from '../../../types';

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
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [exportMessage, setExportMessage] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  const handleSelectAlert = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleBulkResolve = () => {
    selectedAlerts.forEach(alertId => onResolve(alertId));
    setBulkMessage(`${selectedAlerts.size} alerts updated`);
    setSelectedAlerts(new Set());
    setShowBulkActions(false);
    setTimeout(() => setBulkMessage(''), 3000);
  };

  const handleExport = () => {
    setExportMessage('Export started');
    setTimeout(() => setExportMessage(''), 3000);
  };

  // Filtering logic
  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = !severityFilter || alert.severity === severityFilter;
    const matchesSearch = !searchTerm || alert.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
      key: 'select',
      title: '',
      sortable: false,
      width: '50px',
      render: (_: unknown, row: { id: string }) => (
        <input
          type="checkbox"
          data-testid="checkbox"
          checked={selectedAlerts.has(row.id)}
          onChange={() => handleSelectAlert(row.id)}
        />
      ),
    },
    {
      key: 'orderId',
      title: 'Order ID',
      sortable: true,
      width: '120px',
      render: (value: unknown) => <Text variant="bodyMd" as="span">{String(value)}</Text>,
    },
    {
      key: 'customerName',
      title: 'Customer',
      sortable: true,
      width: '150px',
      render: (value: unknown) => <Text variant="bodyMd" as="span">{String(value)}</Text>,
    },
    {
      key: 'delayDays',
      title: 'Delay Days',
      sortable: true,
      width: '100px',
      render: (value: unknown) => {
        const numValue = Number(value);
        return (
          <Badge tone={numValue > 5 ? 'critical' : numValue > 2 ? 'warning' : 'info'}>
            {numValue} days
          </Badge>
        );
      },
    },
    {
      key: 'priority',
      title: 'Priority',
      sortable: true,
      width: '100px',
      render: (value: unknown) => {
        const strValue = String(value);
        return (
          <Badge tone={strValue === 'high' ? 'critical' : strValue === 'medium' ? 'warning' : 'info'}>
            {strValue}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      width: '100px',
      render: (value: unknown) => {
        const strValue = String(value);
        return (
          <Badge tone={strValue === 'active' ? 'warning' : 'success'}>
            {strValue}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      width: '150px',
      render: (_: unknown, row: DataTableRow) => {
        const alert = row as unknown as DelayAlert;
        return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onResolve(alert.id)}
            disabled={alert.status === 'resolved'}
          >
            Resolve
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onDismiss(alert.id)}
          >
            Dismiss
          </Button>
        </div>
        );
      },
    },
  ];

  const rows = paginatedAlerts.map(alert => ({
    id: alert.id,
    orderId: alert.orderId,
    customerName: alert.customerName,
    delayDays: alert.delayDays,
    priority: alert.priority,
    status: alert.status,
  }));

  return (
    <Card title="Delay Alerts">
      {/* Filters */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {/* Severity Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="severity-filter" style={{ fontSize: '14px', fontWeight: '500' }}>Filter by Severity:</label>
          <select
            id="severity-filter"
            data-testid="select"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1); // Reset to first page when filtering
            }}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '120px',
            }}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="order-search" style={{ fontSize: '14px', fontWeight: '500' }}>Search Order:</label>
          <input
            id="order-search"
            type="text"
            data-testid="text-field"
            placeholder="Enter order number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '200px',
            }}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Text variant="bodyMd" as="span">
              {selectedAlerts.size} alert{selectedAlerts.size !== 1 ? 's' : ''} selected
            </Text>
            <Button onClick={handleBulkResolve} variant="primary" size="sm">
              Mark as Resolved
            </Button>
            <Button 
              onClick={() => {
                setSelectedAlerts(new Set());
                setShowBulkActions(false);
              }} 
              variant="secondary" 
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Message */}
      {bulkMessage && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
          <Text variant="bodyMd" as="span">{bulkMessage}</Text>
        </div>
      )}

      {/* Export Button */}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export Alerts
        </Button>
      </div>

      {/* Export Message */}
      {exportMessage && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#d1ecf1', color: '#0c5460', borderRadius: '4px' }}>
          <Text variant="bodyMd" as="span">{exportMessage}</Text>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        sortable
        onSort={() => {}}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '1rem',
          padding: '1rem',
          borderTop: '1px solid #eee',
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Showing {startIndex + 1}-{Math.min(endIndex, alerts.length)} of {alerts.length} alerts
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              variant="secondary"
              size="sm"
            >
              Previous
            </Button>
            <span style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0 12px',
              fontSize: '14px',
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              variant="secondary"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
