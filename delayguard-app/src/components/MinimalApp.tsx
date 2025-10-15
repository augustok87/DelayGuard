import React, { useState, useEffect } from 'react';
import {
  // React UI Components
  Button,
  Text,
  Card,
  Badge,
  Spinner,
  DataTable,
  Tabs,
  Modal,
  Toast,
} from './ui';
import styles from '../styles/DelayGuard.module.css';

// App Bridge integration will be added later
// import { useAppBridge } from '@shopify/app-bridge-react';
// import { Redirect } from '@shopify/app-bridge/actions';

interface AppSettings {
  delayThreshold: number;
  notificationTemplate: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface DelayAlert {
  id: string;
  orderId: string;
  customerName: string;
  delayDays: number;
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  carrierCode?: string;
  createdAt: string;
}

function MinimalApp() {
  const [settings, setSettings] = useState<AppSettings>({
    delayThreshold: 3,
    notificationTemplate: 'Your order #{{orderNumber}} is experiencing a delay. We apologize for the inconvenience.',
    emailNotifications: true,
    smsNotifications: false,
  });

  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Mock data initialization
  useEffect(() => {
    const mockAlerts: DelayAlert[] = [
      {
        id: '1',
        orderId: 'ORD-001',
        customerName: 'John Doe',
        delayDays: 2,
        status: 'active',
        createdAt: '2024-01-20T10:00:00Z',
      },
      {
        id: '2',
        orderId: 'ORD-002',
        customerName: 'Jane Smith',
        delayDays: 5,
        status: 'active',
        createdAt: '2024-01-21T10:00:00Z',
      },
    ];

    const mockOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        status: 'delayed',
        trackingNumber: '1Z999AA1234567890',
        carrierCode: 'UPS',
        createdAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        orderNumber: 'ORD-002',
        customerName: 'Jane Smith',
        status: 'shipped',
        trackingNumber: '1Z999BB1234567890',
        carrierCode: 'FEDEX',
        createdAt: '2024-01-16T10:00:00Z',
      },
    ];

    setAlerts(mockAlerts);
    setOrders(mockOrders);
    setLoading(false);
  }, []);

  const handleSaveSettings = () => {
    setShowSettingsModal(false);
    setToastMessage('Settings saved successfully!');
    setShowToast(true);
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : alert
    ));
    setToastMessage('Alert resolved successfully!');
    setShowToast(true);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'dismissed' as const }
        : alert
    ));
    setToastMessage('Alert dismissed!');
    setShowToast(true);
  };

  const handleTabChange = (tabIndex: number) => {
    setSelectedTab(tabIndex);
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  const renderAlertsTable = () => {
    const headings = ['Order ID', 'Customer', 'Delay Days', 'Status', 'Actions'];
    const rows = alerts.map(alert => [
      alert.orderId,
      alert.customerName,
      alert.delayDays.toString(),
      alert.status,
      '', // Actions handled separately
    ]);

    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <Text variant="headingMd" as="h3">Delay Alerts</Text>
        </div>
        <DataTable
          columns={headings.map((heading, index) => ({
            key: `col-${index}`,
            title: heading,
            sortable: true
          }))}
          rows={rows.map((row, index) => ({
            id: `row-${index}`,
            ...row.reduce((acc, cell, cellIndex) => ({
              ...acc,
              [`col-${cellIndex}`]: cell
            }), {})
          }))}
          sortable
        />
        <div style={{ padding: '16px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
              <div>
                <Text variant="bodyMd" as="span">{alert.orderId} - {alert.customerName}</Text>
                <Badge tone={alert.delayDays > 5 ? 'critical' : alert.delayDays > 3 ? 'warning' : 'info'}>
                  {alert.delayDays} days
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" onClick={() => handleResolveAlert(alert.id)}>
                  Resolve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleDismissAlert(alert.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderOrdersTable = () => {
    const headings = ['Order Number', 'Customer', 'Status', 'Tracking', 'Carrier'];
    const rows = orders.map(order => [
      order.orderNumber,
      order.customerName,
      order.status,
      order.trackingNumber || 'N/A',
      order.carrierCode || 'N/A',
    ]);

    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <Text variant="headingMd" as="h3">Orders</Text>
        </div>
        <DataTable
          columns={headings.map((heading, index) => ({
            key: `col-${index}`,
            title: heading,
            sortable: true
          }))}
          rows={rows.map((row, index) => ({
            id: `row-${index}`,
            ...row.reduce((acc, cell, cellIndex) => ({
              ...acc,
              [`col-${cellIndex}`]: cell
            }), {})
          }))}
          sortable
        />
      </Card>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      isOpen={showSettingsModal}
      title="Settings"
      primaryAction={{
        content: 'Save',
        onAction: handleSaveSettings,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setShowSettingsModal(false),
        },
      ]}
      onClose={() => setShowSettingsModal(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <Text variant="bodyMd" as="div">Delay Threshold (days)</Text>
          <input
            type="number"
            value={settings.delayThreshold}
            onChange={(e) => setSettings(prev => ({ ...prev, delayThreshold: parseInt(e.target.value) }))}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div>
          <Text variant="bodyMd" as="div">Notification Template</Text>
          <textarea
            value={settings.notificationTemplate}
            onChange={(e) => setSettings(prev => ({ ...prev, notificationTemplate: e.target.value }))}
            style={{ width: '100%', padding: '8px', marginTop: '4px', minHeight: '100px' }}
          />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
            />
            <Text variant="bodyMd" as="span">Email Notifications</Text>
          </label>
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={settings.smsNotifications}
              onChange={(e) => setSettings(prev => ({ ...prev, smsNotifications: e.target.checked }))}
            />
            <Text variant="bodyMd" as="span">SMS Notifications</Text>
          </label>
        </div>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Text variant="headingLg" as="h1">DelayGuard</Text>
          <Button onClick={() => setShowSettingsModal(true)}>
            Settings
          </Button>
        </div>

        <Tabs
          tabs={[
            { id: 'alerts', label: 'Alerts', content: renderAlertsTable() },
            { id: 'orders', label: 'Orders', content: renderOrdersTable() },
          ]}
          activeTab={['alerts', 'orders'][selectedTab]}
          onTabChange={(tabId) => {
            const tabIndex = ['alerts', 'orders'].indexOf(tabId);
            if (tabIndex !== -1) {
              handleTabChange(tabIndex);
            }
          }}
        />

        {renderSettingsModal()}

        {showToast && (
          <Toast message={toastMessage} onClose={handleCloseToast} />
        )}
      </div>
    </div>
  );
}

export default MinimalApp;
