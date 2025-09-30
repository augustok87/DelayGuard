import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  FormLayout,
  Checkbox,
  RangeSlider,
  ResourceList,
  ResourceItem,
  Avatar,
  Text,
  ButtonGroup,
  Popover,
  ActionList,
  Icon,
  EmptyState,
  SkeletonBodyText,
  SkeletonDisplayText,
  Toast,
  Frame
} from '@shopify/polaris';
import { AnalyticsDashboard } from './AnalyticsDashboard';

interface AppSettings {
  delayThresholdDays: number;
  emailEnabled: boolean;
  smsEnabled: boolean;
  notificationTemplate: string;
  autoResolveDays: number;
  enableAnalytics: boolean;
}

interface DelayAlert {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  delay_days: number;
  delay_reason: string;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
  estimated_delivery_date: string;
  tracking_number: string;
  carrier_code: string;
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
  total_amount: number;
  currency: string;
}

interface QueueStats {
  delayCheck: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  notifications: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export function EnhancedDashboard() {
  const [settings, setSettings] = useState<AppSettings>({
    delayThresholdDays: 2,
    emailEnabled: true,
    smsEnabled: false,
    notificationTemplate: 'default',
    autoResolveDays: 7,
    enableAnalytics: true
  });
  
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DelayAlert | null>(null);
  const [alertDetailsOpen, setAlertDetailsOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, alertsRes, ordersRes, statsRes] = await Promise.all([
        fetch('/api/settings').then(res => res.json()),
        fetch('/api/alerts?limit=50').then(res => res.json()),
        fetch('/api/orders?limit=50').then(res => res.json()),
        fetch('/api/stats').then(res => res.json())
      ]);

      if (settingsRes.error) throw new Error(settingsRes.error);
      if (alertsRes.error) throw new Error(alertsRes.error);
      if (ordersRes.error) throw new Error(ordersRes.error);
      if (statsRes.error) throw new Error(statsRes.error);

      setSettings(settingsRes);
      setAlerts(alertsRes.alerts || []);
      setOrders(ordersRes.orders || []);
      setQueueStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const updateSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setToastMessage('Settings updated successfully');
      setSettingsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  const testDelayDetection = async (trackingNumber: string, carrierCode: string) => {
    try {
      const response = await fetch('/api/test-delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, carrierCode }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setTestResults(data);
      setTestModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test delay detection');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { status: any; children: string } } = {
      'paid': { status: 'success', children: 'Paid' },
      'pending': { status: 'warning', children: 'Pending' },
      'cancelled': { status: 'critical', children: 'Cancelled' },
      'refunded': { status: 'info', children: 'Refunded' }
    };
    
    const config = statusMap[status] || { status: 'info', children: status };
    return <Badge tone={config.status}>{config.children}</Badge>;
  };

  const getDelaySeverity = (days: number) => {
    if (days <= 2) return { status: 'warning' as const, children: `${days} days` };
    if (days <= 5) return { status: 'attention' as const, children: `${days} days` };
    return { status: 'critical' as const, children: `${days} days` };
  };

  const alertRows = alerts.map(alert => [
    alert.order_number,
    alert.customer_name,
    <Badge {...getDelaySeverity(alert.delay_days)} />,
    alert.delay_reason.replace('_', ' ').toLowerCase(),
    <div style={{ display: 'flex', gap: '8px' }}>
      <Badge tone={alert.email_sent ? 'success' : 'info'}>
        {alert.email_sent ? 'Sent' : 'Pending'}
      </Badge>
      {alert.sms_sent && (
        <Badge tone="success">SMS Sent</Badge>
      )}
    </div>,
    new Date(alert.created_at).toLocaleDateString(),
    <Button
      size="slim"
      onClick={() => {
        setSelectedAlert(alert);
        setAlertDetailsOpen(true);
      }}
    >
      View Details
    </Button>
  ]);

  const orderRows = orders.map(order => [
    order.order_number,
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Text variant="bodyMd" fontWeight="bold" as="span">{order.customer_name}</Text>
      <Text variant="bodyMd" tone="subdued" as="span">{order.customer_email}</Text>
    </div>,
    getStatusBadge(order.status),
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Text variant="bodyMd" fontWeight="bold" as="span">{order.tracking_number || 'N/A'}</Text>
      <Text variant="bodyMd" tone="subdued" as="span">{order.carrier_code || 'N/A'}</Text>
    </div>,
    <Text variant="bodyMd" fontWeight="bold" as="span">
      {order.currency} {order.total_amount?.toFixed(2) || '0.00'}
    </Text>,
    new Date(order.created_at).toLocaleDateString()
  ]);

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'alerts', content: 'Delay Alerts' },
    { id: 'orders', content: 'Orders' },
    { id: 'settings', content: 'Settings' },
    { id: 'analytics', content: 'Analytics' }
  ];

  if (loading) {
    return (
      <Page title="DelayGuard Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '2rem' }}>
                <SkeletonDisplayText size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <SkeletonBodyText lines={3} />
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Frame>
      <Page
        title="DelayGuard Dashboard"
        subtitle="Proactive shipping delay notifications"
        primaryAction={{
          content: 'Test Delay Detection',
          onAction: () => setTestModalOpen(true)
        }}
        secondaryActions={[
          {
            content: 'Settings',
            onAction: () => setSettingsModalOpen(true)
          },
          {
            content: 'Refresh',
            onAction: loadData
          }
        ]}
      >
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
            {selectedTab === 0 && (
              <>
                <Layout.Section>
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <Text variant="headingMd" as="h3">Queue Statistics</Text>
                    {queueStats ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Text variant="headingMd" as="h4">Delay Check Queue</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div>
                            <Text variant="bodyMd" tone="subdued" as="span">Waiting</Text>
                            <Text variant="bodyMd" as="span">{queueStats.delayCheck.waiting}</Text>
                          </div>
                          <div>
                            <Text variant="bodyMd" tone="subdued" as="span">Active</Text>
                            <Text variant="bodyMd" as="span">{queueStats.delayCheck.active}</Text>
                          </div>
                          <div>
                            <Text variant="bodyMd" tone="subdued" as="span">Completed</Text>
                            <Text variant="bodyMd" as="span">{queueStats.delayCheck.completed}</Text>
                          </div>
                          <div>
                            <Text variant="bodyMd" tone="subdued" as="span">Failed</Text>
                            <Text variant="bodyMd" as="span">{queueStats.delayCheck.failed}</Text>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Spinner size="small" />
                    )}
                    </div>
                  </Card>
                </Layout.Section>

                <Layout.Section>
                  <Card>
                    <div style={{ padding: '16px' }}>
                      <Text variant="headingMd" as="h3">Recent Alerts</Text>
                    {alerts.length === 0 ? (
                      <EmptyState
                        heading="No delay alerts"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>No delay alerts have been generated yet.</p>
                      </EmptyState>
                    ) : (
                      <ResourceList
                        items={alerts.slice(0, 5).map(alert => ({
                          id: alert.id.toString(),
                          orderNumber: alert.order_number,
                          customerName: alert.customer_name,
                          delayDays: alert.delay_days
                        }))}
                        renderItem={(item) => (
                          <ResourceItem
                            id={item.id}
                            onClick={() => {
                              const alert = alerts.find(a => a.id.toString() === item.id);
                              if (alert) {
                                setSelectedAlert(alert);
                                setAlertDetailsOpen(true);
                              }
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <Text variant="bodyMd" fontWeight="bold" as="span">Order {item.orderNumber}</Text>
                                <br />
                                <Text variant="bodyMd" tone="subdued" as="span">{item.customerName}</Text>
                              </div>
                              <div>
                                <Badge {...getDelaySeverity(item.delayDays)} />
                              </div>
                            </div>
                          </ResourceItem>
                        )}
                      />
                    )}
                    </div>
                  </Card>
                </Layout.Section>
              </>
            )}

            {selectedTab === 1 && (
              <Layout.Section>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <Text variant="headingMd" as="h3">Delay Alerts</Text>
                  {alerts.length === 0 ? (
                    <EmptyState
                      heading="No delay alerts"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>No delay alerts have been generated yet.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Order', 'Customer', 'Delay', 'Reason', 'Notifications', 'Date', 'Actions']}
                      rows={alertRows}
                    />
                  )}
                  </div>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 2 && (
              <Layout.Section>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <Text variant="headingMd" as="h3">Recent Orders</Text>
                  {orders.length === 0 ? (
                    <EmptyState
                      heading="No orders found"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                      <p>No orders have been processed yet.</p>
                    </EmptyState>
                  ) : (
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                      headings={['Order', 'Customer', 'Status', 'Tracking', 'Total', 'Date']}
                      rows={orderRows}
                    />
                  )}
                  </div>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 3 && (
              <Layout.Section>
                <Card>
                  <div style={{ padding: '16px' }}>
                    <Text variant="headingMd" as="h3">App Settings</Text>
                  <FormLayout>
                    <RangeSlider
                      label="Delay Threshold (days)"
                      value={settings.delayThresholdDays}
                      min={0}
                      max={10}
                      step={1}
                      onChange={(value) => setSettings({
                        ...settings,
                        delayThresholdDays: Array.isArray(value) ? value[0] : value
                      })}
                      output
                    />

                    <Select
                      label="Notification Template"
                      options={[
                        { label: 'Default', value: 'default' },
                        { label: 'Friendly', value: 'friendly' },
                        { label: 'Professional', value: 'professional' },
                        { label: 'Urgent', value: 'urgent' }
                      ]}
                      value={settings.notificationTemplate}
                      onChange={(value) => setSettings({
                        ...settings,
                        notificationTemplate: value
                      })}
                    />

                    <RangeSlider
                      label="Auto-resolve after (days)"
                      value={settings.autoResolveDays}
                      min={1}
                      max={30}
                      step={1}
                      onChange={(value) => setSettings({
                        ...settings,
                        autoResolveDays: Array.isArray(value) ? value[0] : value
                      })}
                      output
                    />

                    <Checkbox
                      label="Enable email notifications"
                      checked={settings.emailEnabled}
                      onChange={(checked) => setSettings({
                        ...settings,
                        emailEnabled: checked
                      })}
                    />

                    <Checkbox
                      label="Enable SMS notifications"
                      checked={settings.smsEnabled}
                      onChange={(checked) => setSettings({
                        ...settings,
                        smsEnabled: checked
                      })}
                    />

                    <Checkbox
                      label="Enable analytics tracking"
                      checked={settings.enableAnalytics}
                      onChange={(checked) => setSettings({
                        ...settings,
                        enableAnalytics: checked
                      })}
                    />

                    <ButtonGroup>
                      <Button variant="primary" onClick={updateSettings}>
                        Save Settings
                      </Button>
                      <Button onClick={() => setSettingsModalOpen(true)}>
                        Advanced Settings
                      </Button>
                    </ButtonGroup>
                  </FormLayout>
                  </div>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 4 && (
              <Layout.Section>
                <AnalyticsDashboard />
              </Layout.Section>
            )}
          </Layout>
        </Tabs>

        {/* Settings Modal */}
        <Modal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          title="Advanced Settings"
          primaryAction={{
            content: 'Save',
            onAction: updateSettings
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setSettingsModalOpen(false)
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="API Rate Limit (requests per minute)"
                type="number"
                value="100"
                disabled
                helpText="Current rate limit for external API calls"
                autoComplete="off"
              />
              <TextField
                label="Queue Concurrency"
                type="number"
                value="5"
                disabled
                helpText="Number of concurrent queue workers"
                autoComplete="off"
              />
              <Checkbox
                label="Enable debug logging"
                checked={false}
                onChange={() => {}}
              />
            </FormLayout>
          </Modal.Section>
        </Modal>

        {/* Test Modal */}
        <Modal
          open={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          title="Test Delay Detection"
          primaryAction={{
            content: 'Test',
            onAction: () => {
              const trackingNumber = prompt('Enter tracking number:');
              const carrierCode = prompt('Enter carrier code (e.g., ups, fedex, usps):');
              if (trackingNumber && carrierCode) {
                testDelayDetection(trackingNumber, carrierCode);
              }
            }
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setTestModalOpen(false)
            }
          ]}
        >
          <Modal.Section>
            {testResults && (
              <Card>
                <div style={{ padding: '16px' }}>
                <Text variant="headingMd" as="h4">Test Results</Text>
                <div style={{ marginTop: '1rem' }}>
                  <p><strong>Is Delayed:</strong> {testResults.delayResult.isDelayed ? 'Yes' : 'No'}</p>
                  <p><strong>Delay Days:</strong> {testResults.delayResult.delayDays || 0}</p>
                  <p><strong>Reason:</strong> {testResults.delayResult.delayReason || 'N/A'}</p>
                  <p><strong>Status:</strong> {testResults.trackingInfo.status}</p>
                </div>
                </div>
              </Card>
            )}
          </Modal.Section>
        </Modal>

        {/* Alert Details Modal */}
        <Modal
          open={alertDetailsOpen}
          onClose={() => setAlertDetailsOpen(false)}
          title={`Alert Details - Order ${selectedAlert?.order_number}`}
          primaryAction={{
            content: 'Close',
            onAction: () => setAlertDetailsOpen(false)
          }}
        >
          <Modal.Section>
            {selectedAlert && (
              <Card>
                <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Customer:</Text> {selectedAlert.customer_name}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Email:</Text> {selectedAlert.customer_email}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Delay Days:</Text> {selectedAlert.delay_days}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Reason:</Text> {selectedAlert.delay_reason}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Tracking:</Text> {selectedAlert.tracking_number}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Carrier:</Text> {selectedAlert.carrier_code}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Estimated Delivery:</Text> {selectedAlert.estimated_delivery_date}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">Email Sent:</Text> {selectedAlert.email_sent ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <Text variant="bodyMd" fontWeight="bold" as="span">SMS Sent:</Text> {selectedAlert.sms_sent ? 'Yes' : 'No'}
                  </div>
                </div>
                </div>
              </Card>
            )}
          </Modal.Section>
        </Modal>

        {/* Toast */}
        {toastMessage && (
          <Toast
            content={toastMessage}
            onDismiss={() => setToastMessage(null)}
          />
        )}
      </Page>
    </Frame>
  );
}
