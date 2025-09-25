import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  DataTable,
  Button,
  Badge,
  TextField,
  Select,
  Tabs,
  Layout,
  Banner,
  Spinner
} from '@shopify/polaris';

interface AppSettings {
  delayThresholdDays: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notificationTemplate: string;
}

interface DelayAlert {
  id: number;
  order_number: string;
  customer_name: string;
  delay_days: number;
  delay_reason: string;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  tracking_number: string;
  carrier_code: string;
  created_at: string;
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>({
    delayThresholdDays: 2,
    emailEnabled: true,
    smsEnabled: false,
    notificationTemplate: 'default'
  });
  
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, alertsRes, ordersRes] = await Promise.all([
        fetch('/api/settings').then(res => res.json()),
        fetch('/api/alerts').then(res => res.json()),
        fetch('/api/orders').then(res => res.json())
      ]);

      if (settingsRes.error) throw new Error(settingsRes.error);
      if (alertsRes.error) throw new Error(alertsRes.error);
      if (ordersRes.error) throw new Error(ordersRes.error);

      setSettings(settingsRes);
      setAlerts(alertsRes.alerts || []);
      setOrders(ordersRes.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const testDelayDetection = async () => {
    try {
      const trackingNumber = prompt('Enter tracking number:');
      const carrierCode = prompt('Enter carrier code (e.g., ups, fedex, usps):');
      
      if (!trackingNumber || !carrierCode) return;

      const response = await fetch('/api/test-delay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trackingNumber, carrierCode }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      alert(`Delay Detection Result:\nIs Delayed: ${data.delayResult.isDelayed}\nDelay Days: ${data.delayResult.delayDays || 0}\nReason: ${data.delayResult.delayReason || 'N/A'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test delay detection');
    }
  };

  if (loading) {
    return (
      <Page title="DelayGuard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner size="large" />
                <p style={{ marginTop: '1rem' }}>Loading DelayGuard...</p>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const tabs = [
    {
      id: 'settings',
      content: 'Settings',
      panelID: 'settings-panel',
    },
    {
      id: 'alerts',
      content: 'Delay Alerts',
      panelID: 'alerts-panel',
    },
    {
      id: 'orders',
      content: 'Orders',
      panelID: 'orders-panel',
    },
  ];

  const alertRows = alerts.map(alert => [
    alert.order_number,
    alert.customer_name,
    <Badge status={alert.delay_days > 3 ? 'critical' : 'warning'}>
      {alert.delay_days} days
    </Badge>,
    alert.delay_reason,
    <Badge status={alert.email_sent ? 'success' : 'info'}>
      {alert.email_sent ? 'Sent' : 'Pending'}
    </Badge>,
    <Badge status={alert.sms_sent ? 'success' : 'info'}>
      {alert.sms_sent ? 'Sent' : 'Pending'}
    </Badge>,
    new Date(alert.created_at).toLocaleDateString()
  ]);

  const orderRows = orders.map(order => [
    order.order_number,
    order.customer_name,
    order.customer_email,
    <Badge status={order.status === 'paid' ? 'success' : 'info'}>
      {order.status}
    </Badge>,
    order.tracking_number || 'N/A',
    order.carrier_code || 'N/A',
    new Date(order.created_at).toLocaleDateString()
  ]);

  return (
    <Page title="DelayGuard - Shipping Delay Detection">
      {error && (
        <Layout>
          <Layout.Section>
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        </Layout>
      )}

      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        <Layout>
          <Layout.Section>
            {selectedTab === 0 && (
              <Card title="App Settings" sectioned>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <TextField
                    label="Delay Threshold (days)"
                    type="number"
                    value={settings.delayThresholdDays.toString()}
                    onChange={(value) => setSettings({
                      ...settings,
                      delayThresholdDays: parseInt(value) || 0
                    })}
                    min={0}
                    max={30}
                    helpText="Minimum delay in days before sending notifications"
                  />

                  <Select
                    label="Notification Template"
                    options={[
                      { label: 'Default', value: 'default' },
                      { label: 'Friendly', value: 'friendly' },
                      { label: 'Professional', value: 'professional' }
                    ]}
                    value={settings.notificationTemplate}
                    onChange={(value) => setSettings({
                      ...settings,
                      notificationTemplate: value
                    })}
                  />

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      primary
                      onClick={updateSettings}
                    >
                      Save Settings
                    </Button>
                    <Button
                      onClick={testDelayDetection}
                    >
                      Test Delay Detection
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {selectedTab === 1 && (
              <Card title="Delay Alerts" sectioned>
                {alerts.length === 0 ? (
                  <p>No delay alerts found.</p>
                ) : (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Order', 'Customer', 'Delay', 'Reason', 'Email', 'SMS', 'Date']}
                    rows={alertRows}
                  />
                )}
              </Card>
            )}

            {selectedTab === 2 && (
              <Card title="Recent Orders" sectioned>
                {orders.length === 0 ? (
                  <p>No orders found.</p>
                ) : (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Order', 'Customer', 'Email', 'Status', 'Tracking', 'Carrier', 'Date']}
                    rows={orderRows}
                  />
                )}
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </Tabs>
    </Page>
  );
}
