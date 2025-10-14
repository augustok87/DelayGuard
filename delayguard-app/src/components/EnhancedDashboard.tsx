import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  // Web Components - Phase 1-3 components
  Button,
  Text,
  Card,
  Badge,
  Spinner,
  EmptyState,
  Section,
  Divider,
  Icon,
  // Web Components - Phase 3 components
  DataTable,
  ResourceList,
  ResourceItem,
  Tabs,
  Modal,
  Toast,
} from './index'; // Import from our Web Components
import AnalyticsDashboard from './AnalyticsDashboard';

interface AppSettings {
  delayThresholdDays: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notificationTemplate: string;
  autoResolveDays: number;
  enableAnalytics: boolean;
}

interface DelayAlert {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  delayDays: number;
  status: 'active' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery?: string;
  status: 'pending' | 'shipped' | 'delivered' | 'delayed';
  trackingNumber?: string;
  carrier?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface StatsData {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: string;
  customerSatisfaction: string;
  supportTicketReduction: string;
}

function EnhancedDashboard() {
  // State management
  const [settings, setSettings] = useState<AppSettings>({
    delayThresholdDays: 3,
    emailEnabled: true,
    smsEnabled: false,
    notificationTemplate: 'Your order #{{orderNumber}} is experiencing a delay. We apologize for the inconvenience.',
    autoResolveDays: 7,
    enableAnalytics: true,
  });

  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockAlerts: DelayAlert[] = [
      {
        id: '1',
        orderId: 'ORD-001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        orderDate: '2024-01-15',
        expectedDelivery: '2024-01-18',
        delayDays: 2,
        status: 'active',
        severity: 'medium',
        createdAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
      },
      {
        id: '2',
        orderId: 'ORD-002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        orderDate: '2024-01-16',
        expectedDelivery: '2024-01-19',
        delayDays: 5,
        status: 'active',
        severity: 'high',
        createdAt: '2024-01-21T10:00:00Z',
        updatedAt: '2024-01-21T10:00:00Z',
      },
    ];

    const mockOrders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        orderDate: '2024-01-15',
        expectedDelivery: '2024-01-18',
        status: 'delayed',
        items: [
          { name: 'Product A', quantity: 2, price: 29.99 },
          { name: 'Product B', quantity: 1, price: 49.99 },
        ],
        total: 109.97,
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA',
        },
      },
    ];

    setAlerts(mockAlerts);
    setOrders(mockOrders);
    setLoading(false);
  }, []);

  const stats: StatsData = {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter(a => a.status === 'active').length,
    resolvedAlerts: alerts.filter(a => a.status === 'resolved').length,
    avgResolutionTime: '2.3 days',
    customerSatisfaction: '94%',
    supportTicketReduction: '35%',
  };

  // Event handlers
  const handleSaveSettings = useCallback(() => {
    setShowSettingsModal(false);
    setToastMessage('Settings saved successfully!');
    setShowToast(true);
  }, []);

  const handleResolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const, updatedAt: new Date().toISOString() }
        : alert
    ));
    setToastMessage('Alert resolved successfully!');
    setShowToast(true);
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'dismissed' as const, updatedAt: new Date().toISOString() }
        : alert
    ));
    setToastMessage('Alert dismissed!');
    setShowToast(true);
  }, []);

  const handleTabChange = useCallback((tabIndex: number) => {
    setSelectedTab(tabIndex);
  }, []);

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  // Render functions
  const renderStatsCards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      <Card sectioned>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{stats.totalAlerts}</Text>
          <Text variant="bodyMd" tone="subdued">Total Alerts</Text>
        </div>
      </Card>
      <Card sectioned>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{stats.activeAlerts}</Text>
          <Text variant="bodyMd" tone="subdued">Active Alerts</Text>
        </div>
      </Card>
      <Card sectioned>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{stats.resolvedAlerts}</Text>
          <Text variant="bodyMd" tone="subdued">Resolved</Text>
        </div>
      </Card>
      <Card sectioned>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{stats.avgResolutionTime}</Text>
          <Text variant="bodyMd" tone="subdued">Avg Resolution</Text>
        </div>
      </Card>
    </div>
  );

  const renderAlertsTable = () => {
    const headings = ['Order ID', 'Customer', 'Delay Days', 'Severity', 'Status', 'Actions'];
    const rows = alerts.map(alert => [
      alert.orderId,
      alert.customerName,
      alert.delayDays.toString(),
      alert.severity,
      alert.status,
      '', // Actions will be handled separately
    ]);

    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <Text variant="headingMd" as="h3">Delay Alerts</Text>
        </div>
        <DataTable
          headings={headings}
          rows={rows}
          sortable
        />
        <div style={{ padding: '16px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
              <div>
                <Text variant="bodyMd" as="span">{alert.orderId} - {alert.customerName}</Text>
                <Badge tone={alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'attention' : 'info'}>
                  {alert.severity}
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="small" onClick={() => handleResolveAlert(alert.id)}>
                  Resolve
                </Button>
                <Button size="small" variant="secondary" onClick={() => handleDismissAlert(alert.id)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderOrdersList = () => (
    <Card>
      <div style={{ padding: '16px' }}>
        <Text variant="headingMd" as="h3">Recent Orders</Text>
      </div>
      <ResourceList
        items={orders}
        renderItem={(order: Order) => (
          <ResourceItem id={order.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <Text variant="bodyMd" as="span">{order.orderNumber}</Text>
                <Text variant="bodySm" tone="subdued" as="div">{order.customerName}</Text>
                <Badge tone={order.status === 'delayed' ? 'critical' : 'success'}>
                  {order.status}
                </Badge>
              </div>
              <div>
                <Text variant="bodyMd" as="span">${order.total.toFixed(2)}</Text>
              </div>
            </div>
          </ResourceItem>
        )}
      />
    </Card>
  );

  const renderSettingsModal = () => (
    <Modal
      open={showSettingsModal}
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
      <Modal.Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Text variant="bodyMd" as="div">Delay Threshold (days)</Text>
            <input
              type="number"
              value={settings.delayThresholdDays}
              onChange={(e) => setSettings(prev => ({ ...prev, delayThresholdDays: parseInt(e.target.value) }))}
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
              />
              <Text variant="bodyMd" as="span">Email Notifications</Text>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.smsEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, smsEnabled: e.target.checked }))}
              />
              <Text variant="bodyMd" as="span">SMS Notifications</Text>
            </label>
          </div>
        </div>
      </Modal.Section>
    </Modal>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Text variant="headingLg" as="h1">DelayGuard Dashboard</Text>
        <Button onClick={() => setShowSettingsModal(true)}>
          Settings
        </Button>
      </div>

      {renderStatsCards()}

      <Tabs
        tabs={[
          { id: 'alerts', content: 'Alerts' },
          { id: 'orders', content: 'Orders' },
          { id: 'analytics', content: 'Analytics' },
        ]}
        selected={selectedTab}
        onSelect={handleTabChange}
      >
        {selectedTab === 0 && renderAlertsTable()}
        {selectedTab === 1 && renderOrdersList()}
        {selectedTab === 2 && (
          <Card>
            <div style={{ padding: '16px' }}>
              <Text variant="headingMd" as="h3">Analytics</Text>
              <EmptyState
                heading="Analytics coming soon"
                action={{
                  content: 'Learn more',
                  onAction: () => {},
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text variant="bodyMd" as="p">
                  Detailed analytics and reporting features will be available in a future update.
                </Text>
              </EmptyState>
            </div>
          </Card>
        )}
      </Tabs>

      {renderSettingsModal()}

      {showToast && (
        <Toast content={toastMessage} onDismiss={handleCloseToast} />
      )}
    </div>
  );
}

export default EnhancedDashboard;
