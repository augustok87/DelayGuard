import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  Layout,
  DisplayText,
  TextStyle,
  Stack,
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
  Toast
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
    const severityMap: { [key: string]: { status: any; color: string } } = {
      low: { status: 'info', color: '#007ace' },
      medium: { status: 'warning', color: '#ffc453' },
      high: { status: 'attention', color: '#ff9500' },
      critical: { status: 'critical', color: '#d82c0d' }
    };
    
    const config = severityMap[severity] || { status: 'info', color: '#007ace' };
    return (
      <Badge status={config.status}>
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
                  <TextStyle variation="subdued">Loading analytics data...</TextStyle>
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
              <Banner status="critical" onDismiss={() => setError(null)}>
                {error}
              </Banner>
            </Layout.Section>
          </Layout>
        )}

        <Layout>
          <Layout.Section oneThird>
            <Card title="Time Range" sectioned>
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
            </Card>
          </Layout.Section>

          <Layout.Section twoThirds>
            <Card title="Key Metrics" sectioned>
              {metrics && (
                <Stack distribution="fill">
                  <div style={{ textAlign: 'center' }}>
                    <DisplayText size="medium">{metrics.totalOrders}</DisplayText>
                    <TextStyle variation="subdued">Total Orders</TextStyle>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <DisplayText size="medium">{metrics.totalAlerts}</DisplayText>
                    <TextStyle variation="subdued">Delay Alerts</TextStyle>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <DisplayText size="medium">{metrics.averageDelayDays.toFixed(1)}</DisplayText>
                    <TextStyle variation="subdued">Avg Delay Days</TextStyle>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <DisplayText size="medium">${metrics.revenueImpact.totalValue.toLocaleString()}</DisplayText>
                    <TextStyle variation="subdued">Total Revenue</TextStyle>
                  </div>
                </Stack>
              )}
            </Card>
          </Layout.Section>
        </Layout>

        <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
          <Layout>
            {selectedTab === 0 && metrics && (
              <>
                <Layout.Section oneHalf>
                  <Card title="Alerts by Severity" sectioned>
                    <Stack vertical>
                      {Object.entries(metrics.alertsBySeverity).map(([severity, count]) => (
                        <Stack key={severity} distribution="fill">
                          <TextStyle variation="strong">{severity.toUpperCase()}</TextStyle>
                          <Badge status={severity === 'critical' ? 'critical' : severity === 'high' ? 'attention' : severity === 'medium' ? 'warning' : 'info'}>
                            {count}
                          </Badge>
                        </Stack>
                      ))}
                    </Stack>
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
                            <Stack distribution="fill">
                              <TextStyle variation="strong">{item.reason.replace('_', ' ').toLowerCase()}</TextStyle>
                              <Badge>{item.count}</Badge>
                            </Stack>
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
                  <Stack distribution="fill">
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{metrics.performanceMetrics.averageResponseTime.toFixed(0)}ms</DisplayText>
                      <TextStyle variation="subdued">Avg Response Time</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{metrics.performanceMetrics.successRate.toFixed(1)}%</DisplayText>
                      <TextStyle variation="subdued">Success Rate</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{metrics.performanceMetrics.errorRate.toFixed(1)}%</DisplayText>
                      <TextStyle variation="subdued">Error Rate</TextStyle>
                    </div>
                  </Stack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 2 && metrics && (
              <Layout.Section>
                <Card title="Revenue Impact" sectioned>
                  <Stack distribution="fill">
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">${metrics.revenueImpact.totalValue.toLocaleString()}</DisplayText>
                      <TextStyle variation="subdued">Total Revenue</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">${metrics.revenueImpact.averageOrderValue.toFixed(2)}</DisplayText>
                      <TextStyle variation="subdued">Avg Order Value</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">${metrics.revenueImpact.potentialLoss.toFixed(2)}</DisplayText>
                      <TextStyle variation="subdued">Potential Loss</TextStyle>
                    </div>
                  </Stack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 3 && metrics && (
              <Layout.Section>
                <Card title="Notification Performance" sectioned>
                  <Stack distribution="fill">
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{metrics.notificationSuccessRate.email.toFixed(1)}%</DisplayText>
                      <TextStyle variation="subdued">Email Success Rate</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{metrics.notificationSuccessRate.sms.toFixed(1)}%</DisplayText>
                      <TextStyle variation="subdued">SMS Success Rate</TextStyle>
                    </div>
                  </Stack>
                </Card>
              </Layout.Section>
            )}

            {selectedTab === 4 && realtimeMetrics && (
              <Layout.Section>
                <Card title="Real-time Metrics" sectioned>
                  <Stack distribution="fill">
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{realtimeMetrics.activeAlerts}</DisplayText>
                      <TextStyle variation="subdued">Active Alerts</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{realtimeMetrics.queueSize}</DisplayText>
                      <TextStyle variation="subdued">Queue Size</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{realtimeMetrics.processingRate.toFixed(1)}/min</DisplayText>
                      <TextStyle variation="subdued">Processing Rate</TextStyle>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <DisplayText size="medium">{realtimeMetrics.memoryUsage}MB</DisplayText>
                      <TextStyle variation="subdued">Memory Usage</TextStyle>
                    </div>
                  </Stack>
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
              <TextStyle variation="subdued">
                Choose the format for exporting your analytics data. JSON format includes all detailed metrics, 
                while CSV format provides a simplified table view suitable for spreadsheet applications.
              </TextStyle>
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
