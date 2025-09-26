import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  Text,
  Badge,
  Button,
  Select,
  Spinner,
  Banner,
  DataTable,
  ResourceList,
  ResourceItem,
  EmptyState,
  Modal,
  FormLayout,
  TextField,
  ButtonGroup,
  Tabs,
  Frame,
  Toast,
  BlockStack,
  InlineStack
} from '@shopify/polaris';

interface AnalyticsMetrics {
  totalOrders: number;
  totalAlerts: number;
  alertsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  alertsByReason: {
    [reason: string]: number;
  };
  averageDelayDays: number;
  notificationSuccessRate: {
    email: number;
    sms: number;
  };
  revenueImpact: {
    totalValue: number;
    averageOrderValue: number;
    potentialLoss: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  timeSeriesData: {
    date: string;
    orders: number;
    alerts: number;
    revenue: number;
  }[];
}

interface RealTimeMetrics {
  activeAlerts: number;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  memoryUsage: number;
  responseTime: number;
}

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedTab, setSelectedTab] = useState(0);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, realtimeRes] = await Promise.all([
        fetch(`/api/analytics?timeRange=${timeRange}`).then(res => res.json()),
        fetch('/api/analytics/realtime').then(res => res.json())
      ]);

      if (analyticsRes.error) throw new Error(analyticsRes.error);
      if (realtimeRes.error) throw new Error(realtimeRes.error);

      setMetrics(analyticsRes.data);
      setRealtimeMetrics(realtimeRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/analytics/export?format=${format}&timeRange=${timeRange}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delayguard-analytics-${timeRange}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setToastMessage(`Analytics exported as ${format.toUpperCase()}`);
      setExportModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics');
    }
  };

  const getSeverityBadge = (severity: string, count: number) => {
    const severityMap: { [key: string]: { tone: any; color: string } } = {
      low: { tone: 'info', color: '#007ace' },
      medium: { tone: 'warning', color: '#ffc453' },
      high: { tone: 'attention', color: '#ff9500' },
      critical: { tone: 'critical', color: '#d82c0d' }
    };
    
    const config = severityMap[severity] || { tone: 'info', color: '#007ace' };
    return (
      <Badge tone={config.tone}>
        {severity.toUpperCase()}: {count}
      </Badge>
    );
  };

  const tabs = [
    { id: 'overview', content: 'Overview' },
    { id: 'performance', content: 'Performance' },
    { id: 'revenue', content: 'Revenue' },
    { id: 'notifications', content: 'Notifications' },
    { id: 'realtime', content: 'Real-time' }
  ];

  if (loading) {
    return (
      <Page title="Analytics Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <Text as="p" tone="subdued">Loading analytics data...</Text>
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
        title="Analytics Dashboard"
        subtitle="Comprehensive insights into your delay detection performance"
        primaryAction={{
          content: 'Export Data',
          onAction: () => setExportModalOpen(true)
        }}
        secondaryActions={[
          {
            content: 'Refresh',
            onAction: loadAnalytics
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

        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                <Text variant="headingMd" as="h3">Time Range</Text>
              </Card.Section>
              <Card.Section>
                <Select
                  options={[
                    { label: 'Last 7 days', value: '7d' },
                    { label: 'Last 30 days', value: '30d' },
                    { label: 'Last 90 days', value: '90d' },
                    { label: 'Last year', value: '1y' }
                  ]}
                  value={timeRange}
                  onChange={(value) => setTimeRange(value as any)}
                />
              </Card.Section>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Card.Section>
                <Text variant="headingMd" as="h3">Key Metrics</Text>
              </Card.Section>
              <Card.Section>
                {metrics && (
                  <InlineStack gap="400" align="space-between">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.totalOrders}</Text>
                      <Text as="p" tone="subdued">Total Orders</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.totalAlerts}</Text>
                      <Text as="p" tone="subdued">Delay Alerts</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.averageDelayDays.toFixed(1)}</Text>
                      <Text as="p" tone="subdued">Avg Delay Days</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">${metrics.revenueImpact.totalValue.toLocaleString()}</Text>
                      <Text as="p" tone="subdued">Total Revenue</Text>
                    </div>
                  </InlineStack>
                )}
              </Card.Section>
            </Card>
          </Layout.Section>
        </Layout>

        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <Layout>
            {selectedTab === 0 && metrics && (
              <>
                <Layout.Section oneHalf>
                  <Card title="Alerts by Severity" sectioned>
                    <BlockStack gap="200">
                      {Object.entries(metrics.alertsBySeverity).map(([severity, count]) => (
                        <InlineStack key={severity} gap="200" align="space-between">
                          <Text as="span" fontWeight="bold">{severity.toUpperCase()}</Text>
                          <Badge tone={severity === 'critical' ? 'critical' : severity === 'high' ? 'attention' : severity === 'medium' ? 'warning' : 'info'}>
                            {count}
                          </Badge>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </Card>
                </Layout.Section>

                <Layout.Section oneHalf>
                  <Card title="Alerts by Reason" sectioned>
                    {Object.keys(metrics.alertsByReason).length === 0 ? (
                      <EmptyState
                        heading="No alert reasons"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>No delay alerts have been generated yet.</p>
                      </EmptyState>
                    ) : (
                      <ResourceList
                        items={Object.entries(metrics.alertsByReason).map(([reason, count]) => ({
                          id: reason,
                          reason,
                          count
                        }))}
                        renderItem={(item) => (
                          <ResourceItem id={item.id}>
                            <InlineStack gap="200" align="space-between">
                              <Text as="span" fontWeight="bold">{item.reason.replace('_', ' ').toLowerCase()}</Text>
                              <Badge>{item.count}</Badge>
                            </InlineStack>
                          </ResourceItem>
                        )}
                      />
                    )}
                  </Card>
                </Layout.Section>

                <Layout.Section>
                  <Card title="Time Series Data" sectioned>
                    {metrics.timeSeriesData.length === 0 ? (
                      <EmptyState
                        heading="No time series data"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <p>No data available for the selected time range.</p>
                      </EmptyState>
                    ) : (
                      <DataTable
                        columnContentTypes={['text', 'numeric', 'numeric', 'numeric']}
                        headings={['Date', 'Orders', 'Alerts', 'Revenue']}
                        rows={metrics.timeSeriesData.map(data => [
                          new Date(data.date).toLocaleDateString(),
                          data.orders.toString(),
                          data.alerts.toString(),
                          `$${data.revenue.toFixed(2)}`
                        ])}
                      />
                    )}
                  </Card>
                </Layout.Section>
              </>
            )}

            {selectedTab === 1 && metrics && (
              <Layout.Section>
                <Card title="Performance Metrics" sectioned>
                  <InlineStack gap="200" align="space-between">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.performanceMetrics.averageResponseTime.toFixed(0)}ms</Text>
                      <Text as="p" tone="subdued">Avg Response Time</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.performanceMetrics.successRate.toFixed(1)}%</Text>
                      <Text as="p" tone="subdued">Success Rate</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.performanceMetrics.errorRate.toFixed(1)}%</Text>
                      <Text as="p" tone="subdued">Error Rate</Text>
                    </div>
                  </InlineStack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 2 && metrics && (
              <Layout.Section>
                <Card title="Revenue Impact" sectioned>
                  <InlineStack gap="200" align="space-between">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">${metrics.revenueImpact.totalValue.toLocaleString()}</Text>
                      <Text as="p" tone="subdued">Total Revenue</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">${metrics.revenueImpact.averageOrderValue.toFixed(2)}</Text>
                      <Text as="p" tone="subdued">Avg Order Value</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">${metrics.revenueImpact.potentialLoss.toFixed(2)}</Text>
                      <Text as="p" tone="subdued">Potential Loss</Text>
                    </div>
                  </InlineStack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 3 && metrics && (
              <Layout.Section>
                <Card title="Notification Performance" sectioned>
                  <InlineStack gap="200" align="space-between">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.notificationSuccessRate.email.toFixed(1)}%</Text>
                      <Text as="p" tone="subdued">Email Success Rate</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{metrics.notificationSuccessRate.sms.toFixed(1)}%</Text>
                      <Text as="p" tone="subdued">SMS Success Rate</Text>
                    </div>
                  </InlineStack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 4 && realtimeMetrics && (
              <Layout.Section>
                <Card title="Real-time Metrics" sectioned>
                  <InlineStack gap="200" align="space-between">
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{realtimeMetrics.activeAlerts}</Text>
                      <Text as="p" tone="subdued">Active Alerts</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{realtimeMetrics.queueSize}</Text>
                      <Text as="p" tone="subdued">Queue Size</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{realtimeMetrics.processingRate.toFixed(1)}/min</Text>
                      <Text as="p" tone="subdued">Processing Rate</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <Text variant="headingLg" as="h3">{realtimeMetrics.memoryUsage}MB</Text>
                      <Text as="p" tone="subdued">Memory Usage</Text>
                    </div>
                  </InlineStack>
                </Card>
              </Layout.Section>
            )}
          </Layout>
        </Tabs>

        {/* Export Modal */}
        <Modal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          title="Export Analytics Data"
          primaryAction={{
            content: 'Export JSON',
            onAction: () => handleExport('json')
          }}
          secondaryActions={[
            {
              content: 'Export CSV',
              onAction: () => handleExport('csv')
            },
            {
              content: 'Cancel',
              onAction: () => setExportModalOpen(false)
            }
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <Text as="p" tone="subdued">
                Choose the format for exporting your analytics data. JSON format includes all detailed metrics, 
                while CSV format provides a simplified table view suitable for spreadsheet applications.
              </Text>
            </FormLayout>
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
