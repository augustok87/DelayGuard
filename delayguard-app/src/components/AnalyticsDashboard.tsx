import React, { useState, useEffect, useCallback } from 'react';
import {
  // React UI Components
  Button,
  Text,
  Card,
  Badge,
  Spinner,
  DataTable,
  Modal,
  Tabs,
  Toast,
} from './ui';

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
  customerSatisfaction: number;
  resolutionTime: {
    average: number;
    median: number;
  };
}

interface AnalyticsDashboardProps {
  dateRange?: {
    start: string;
    end: string;
  };
  onExport?: (data: AnalyticsMetrics) => void;
}

const defaultMetrics: AnalyticsMetrics = {
  totalOrders: 1250,
  totalAlerts: 89,
  alertsBySeverity: {
    low: 45,
    medium: 28,
    high: 12,
    critical: 4,
  },
  alertsByReason: {
    'Weather Delay': 23,
    'Carrier Issue': 18,
    'Address Problem': 15,
    'Customs Delay': 12,
    'Package Damage': 8,
    'Other': 13,
  },
  averageDelayDays: 3.2,
  notificationSuccessRate: {
    email: 94.5,
    sms: 87.2,
  },
  customerSatisfaction: 4.2,
  resolutionTime: {
    average: 2.3,
    median: 1.8,
  },
};

function AnalyticsDashboard({ dateRange, onExport }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (dateRange) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setMetrics(defaultMetrics);
        setLoading(false);
      }, 1000);
    }
  }, [dateRange]);

  const handleTabChange = useCallback((tabIndex: number) => {
    setSelectedTab(tabIndex);
  }, []);

  const handleExport = useCallback(() => {
    setShowExportModal(false);
    if (onExport) {
      onExport(metrics);
    }
    setToastMessage('Analytics data exported successfully!');
    setShowToast(true);
  }, [metrics, onExport]);

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  const renderOverviewCards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{metrics.totalOrders.toLocaleString()}</Text>
          <Text variant="bodyMd" tone="subdued">Total Orders</Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{metrics.totalAlerts}</Text>
          <Text variant="bodyMd" tone="subdued">Total Alerts</Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{metrics.averageDelayDays} days</Text>
          <Text variant="bodyMd" tone="subdued">Avg Delay</Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: 'center' }}>
          <Text variant="headingLg" as="h3">{metrics.customerSatisfaction}/5</Text>
          <Text variant="bodyMd" tone="subdued">Satisfaction</Text>
        </div>
      </Card>
    </div>
  );

  const renderSeverityBreakdown = () => (
    <Card>
      <div style={{ padding: '16px' }}>
        <Text variant="headingMd" as="h3">Alerts by Severity</Text>
      </div>
      <div style={{ padding: '16px' }}>
        {Object.entries(metrics.alertsBySeverity).map(([severity, count]) => (
          <div key={severity} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge tone={severity === 'critical' ? 'critical' : severity === 'high' ? 'warning' : 'info'}>
                {severity}
              </Badge>
            </div>
            <Text variant="bodyMd" as="span">{count}</Text>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderReasonBreakdown = () => {
    const headings = ['Reason', 'Count', 'Percentage'];
    const totalAlerts = Object.values(metrics.alertsByReason).reduce((sum, count) => sum + count, 0);
    const rows = Object.entries(metrics.alertsByReason).map(([reason, count]) => [
      reason,
      count.toString(),
      `${((count / totalAlerts) * 100).toFixed(1)}%`,
    ]);

    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <Text variant="headingMd" as="h3">Alerts by Reason</Text>
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

  const renderNotificationMetrics = () => (
    <Card>
      <div style={{ padding: '16px' }}>
        <Text variant="headingMd" as="h3">Notification Success Rates</Text>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
          <Text variant="bodyMd" as="span">Email</Text>
          <Text variant="bodyMd" as="span">{metrics.notificationSuccessRate.email}%</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
          <Text variant="bodyMd" as="span">SMS</Text>
          <Text variant="bodyMd" as="span">{metrics.notificationSuccessRate.sms}%</Text>
        </div>
      </div>
    </Card>
  );

  const renderResolutionMetrics = () => (
    <Card>
      <div style={{ padding: '16px' }}>
        <Text variant="headingMd" as="h3">Resolution Time</Text>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
          <Text variant="bodyMd" as="span">Average</Text>
          <Text variant="bodyMd" as="span">{metrics.resolutionTime.average} days</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
          <Text variant="bodyMd" as="span">Median</Text>
          <Text variant="bodyMd" as="span">{metrics.resolutionTime.median} days</Text>
        </div>
      </div>
    </Card>
  );

  const renderExportModal = () => (
    <Modal
      isOpen={showExportModal}
      title="Export Analytics"
      primaryAction={{
        content: 'Export',
        onAction: handleExport,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: () => setShowExportModal(false),
        },
      ]}
      onClose={() => setShowExportModal(false)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Text variant="bodyMd" as="p">
          Choose the format for exporting your analytics data:
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="radio" name="format" value="csv" defaultChecked />
            <Text variant="bodyMd" as="span">CSV (Excel compatible)</Text>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="radio" name="format" value="json" />
            <Text variant="bodyMd" as="span">JSON (API format)</Text>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="radio" name="format" value="pdf" />
            <Text variant="bodyMd" as="span">PDF (Report format)</Text>
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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Text variant="headingLg" as="h1">Analytics Dashboard</Text>
        <Button onClick={() => setShowExportModal(true)}>
          Export Data
        </Button>
      </div>

      {renderOverviewCards()}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', content: (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {renderSeverityBreakdown()}
              {renderNotificationMetrics()}
            </div>
          )},
          { id: 'severity', label: 'Severity', content: renderSeverityBreakdown() },
          { id: 'reasons', label: 'Reasons', content: renderReasonBreakdown() },
          { id: 'notifications', label: 'Notifications', content: renderNotificationMetrics() },
          { id: 'resolution', label: 'Resolution', content: renderResolutionMetrics() },
        ]}
        activeTab={['overview', 'severity', 'reasons', 'notifications', 'resolution'][selectedTab]}
        onTabChange={(tabId) => {
          const tabIndex = ['overview', 'severity', 'reasons', 'notifications', 'resolution'].indexOf(tabId);
          if (tabIndex !== -1) {
            handleTabChange(tabIndex);
          }
        }}
      />

      {renderExportModal()}

      {showToast && (
        <Toast message={toastMessage} onClose={handleCloseToast} />
      )}
    </div>
  );
}

export default AnalyticsDashboard;
