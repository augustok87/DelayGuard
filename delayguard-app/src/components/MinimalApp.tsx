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
  Spinner,
  Text,
  BlockStack,
  InlineStack
} from '@shopify/polaris';
// App Bridge integration will be added later
// import { useAppBridge } from '@shopify/app-bridge-react';
// import { Redirect } from '@shopify/app-bridge/actions';

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

export function MinimalApp() {
  // App Bridge integration will be added later
  // const app = useAppBridge();
  // const redirect = app ? Redirect.create(app) : null;
  
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
  const [shop, setShop] = useState<string | null>(null);

  useEffect(() => {
    // Get shop information from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    if (shopParam) {
      setShop(shopParam);
    }
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for now - will connect to real API later
      setAlerts([
        {
          id: 1,
          order_number: '1001',
          customer_name: 'John Doe',
          delay_days: 3,
          delay_reason: 'Weather delay',
          email_sent: true,
          sms_sent: false,
          created_at: '2024-01-15T10:00:00Z'
        }
      ]);
      setOrders([
        {
          id: 1,
          order_number: '1001',
          customer_name: 'John Doe',
          customer_email: 'john@example.com',
          status: 'shipped',
          tracking_number: '1Z999AA1234567890',
          carrier_code: 'ups',
          created_at: '2024-01-15T10:00:00Z'
        }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    try {
      // Mock API call
      console.log('Updating settings:', settings);
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

      // Mock API call
      alert(`Delay Detection Result:\nTracking: ${trackingNumber}\nCarrier: ${carrierCode}\nStatus: Mock response`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test delay detection');
    }
  };

  const handleShopifyAuth = () => {
    // Simple redirect to Shopify OAuth flow
    const authUrl = `/auth/shopify?shop=${shop || 'your-shop.myshopify.com'}`;
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <Page title="DelayGuard">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400" align="center">
                <Spinner size="large" />
                <Text as="p">Loading DelayGuard...</Text>
              </BlockStack>
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
    <Badge tone={alert.delay_days > 3 ? 'critical' : 'warning'}>
      {`${alert.delay_days} days`}
    </Badge>,
    alert.delay_reason,
    <Badge tone={alert.email_sent ? 'success' : 'info'}>
      {alert.email_sent ? 'Sent' : 'Pending'}
    </Badge>,
    <Badge tone={alert.sms_sent ? 'success' : 'info'}>
      {alert.sms_sent ? 'Sent' : 'Pending'}
    </Badge>,
    new Date(alert.created_at).toLocaleDateString()
  ]);

  const orderRows = orders.map(order => [
    order.order_number,
    order.customer_name,
    order.customer_email,
    <Badge tone={order.status === 'shipped' ? 'success' : 'info'}>
      {order.status}
    </Badge>,
    order.tracking_number || 'N/A',
    order.carrier_code || 'N/A',
    new Date(order.created_at).toLocaleDateString()
  ]);

  return (
    <Page title={`DelayGuard - Shipping Delay Detection${shop ? ` (${shop})` : ''}`}>
      {error && (
        <Layout>
          <Layout.Section>
            <Banner tone="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          </Layout.Section>
        </Layout>
      )}

      <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
        <Layout>
          <Layout.Section>
                        {selectedTab === 0 && (
                          <Card>
                            <BlockStack gap="400">
                              <Text variant="headingMd" as="h2">App Settings</Text>
                              
                              {shop ? (
                                <Banner tone="success">
                                  <Text as="p">Connected to Shopify store: <strong>{shop}</strong></Text>
                                </Banner>
                              ) : (
                                <Banner tone="warning">
                                  <Text as="p">Not connected to Shopify. Click below to authenticate.</Text>
                                </Banner>
                              )}

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
                                autoComplete="off"
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

                              <InlineStack gap="200">
                                <Button
                                  variant="primary"
                                  onClick={updateSettings}
                                >
                                  Save Settings
                                </Button>
                                <Button
                                  onClick={testDelayDetection}
                                >
                                  Test Delay Detection
                                </Button>
                                {!shop && (
                                  <Button
                                    variant="secondary"
                                    onClick={handleShopifyAuth}
                                  >
                                    Connect to Shopify
                                  </Button>
                                )}
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        )}

            {selectedTab === 1 && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Delay Alerts</Text>
                  {alerts.length === 0 ? (
                    <Text as="p">No delay alerts found.</Text>
                  ) : (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Order', 'Customer', 'Delay', 'Reason', 'Email', 'SMS', 'Date']}
                      rows={alertRows}
                    />
                  )}
                </BlockStack>
              </Card>
            )}

            {selectedTab === 2 && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Recent Orders</Text>
                  {orders.length === 0 ? (
                    <Text as="p">No orders found.</Text>
                  ) : (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Order', 'Customer', 'Email', 'Status', 'Tracking', 'Carrier', 'Date']}
                      rows={orderRows}
                    />
                  )}
                </BlockStack>
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </Tabs>
    </Page>
  );
}
