import React, { useState, useEffect, useCallback } from "react";
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
} from "./ui";
import {
  analyticsService,
  AnalyticsMetrics,
} from "../services/analytics-service";

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
    "Weather Delay": 23,
    "Carrier Issue": 18,
    "Address Problem": 15,
    "Customs Delay": 12,
    "Package Damage": 8,
    Other: 13,
  },
  averageDelayDays: 3.2,
  notificationSuccessRate: {
    email: 95.5,
    sms: 87.2,
  },
  customerSatisfaction: 4.2,
  resolutionTime: {
    average: 2.3,
    median: 1.8,
  },
};

function AnalyticsDashboard({
  dateRange: propDateRange,
  onExport,
}: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSelectedTab] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  } | null>(propDateRange || null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [alerts] = useState([
    {
      id: "1",
      order_number: "ORD-001",
      customer_name: "John Doe",
      delay_days: 3,
      severity: "high",
    },
    {
      id: "2",
      order_number: "ORD-002",
      customer_name: "Jane Smith",
      delay_days: 1,
      severity: "medium",
    },
  ]);

  // Use the analytics service

  useEffect(() => {
    // Load initial data
    const loadInitialData = async() => {
      try {
        setLoading(true);
        setError(null);
        await analyticsService.getMetrics();
        setMetrics(defaultMetrics);
        setLoading(false);
      } catch (err) {
        setError("Failed to load analytics data");
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (dateRange) {
      setLoading(true);
      setError(null);
      // Simulate API call
      analyticsService
        .getMetrics(dateRange || undefined)
        .then(() => {
          setMetrics(defaultMetrics);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load analytics data");
          setLoading(false);
        });
    }
  }, [dateRange]);

  // Handle date range filtering
  const handleDateRangeChange = useCallback((start: string, end: string) => {
    const newDateRange = { start, end };
    setDateRange(newDateRange);

    // Trigger API call immediately when date range changes
    if (start || end) {
      setLoading(true);
      setError(null);
      analyticsService
        .getMetrics(newDateRange)
        .then(() => {
          setMetrics(defaultMetrics);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load analytics data");
          setLoading(false);
        });
    }
  }, []);

  const handleTabChange = useCallback((tabIndex: number) => {
    setSelectedTab(tabIndex);
  }, []);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    // Simulate API call
    analyticsService
      .getMetrics(dateRange || undefined)
      .then(() => {
        setMetrics(defaultMetrics);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to refresh analytics data");
        setLoading(false);
      });
  }, [dateRange]);

  const handleExport = useCallback(() => {
    setShowExportModal(false);
    if (onExport) {
      onExport(metrics);
    }
    analyticsService.exportData(metrics);
    setToastMessage("Analytics data exported successfully!");
    setShowToast(true);
  }, [metrics, onExport]);

  // Handle window focus for data refresh
  useEffect(() => {
    const handleFocus = () => {
      // Simulate data refresh on window focus
      if (onExport) {
        onExport(metrics);
      }
      handleRefresh();
    };
    handleFocus.displayName = "handleFocus";

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [metrics, onExport, handleRefresh]);

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  const filteredAlerts =
    severityFilter === "all"
      ? alerts
      : alerts.filter((alert) => alert.severity === severityFilter);

  const renderOverviewCards = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}
    >
      <Card>
        <div style={{ textAlign: "center" }}>
          <Text variant="headingLg" as="h3">
            {metrics.totalOrders.toLocaleString()}
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Total Orders
          </Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: "center" }}>
          <Text variant="headingLg" as="h3">
            {metrics.totalAlerts}
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Total Alerts
          </Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: "center" }}>
          <Text variant="headingLg" as="h3">
            {metrics.averageDelayDays} days
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Avg Delay
          </Text>
        </div>
      </Card>
      <Card>
        <div style={{ textAlign: "center" }}>
          <Text variant="headingLg" as="h3">
            {metrics.customerSatisfaction}/5
          </Text>
          <Text variant="bodyMd" tone="subdued">
            Satisfaction
          </Text>
        </div>
      </Card>
    </div>
  );

  const renderSeverityBreakdown = () => (
    <Card>
      <div style={{ padding: "16px" }}>
        <Text variant="headingMd" as="h3">
          Alerts by Severity
        </Text>
      </div>
      <div style={{ padding: "16px" }}>
        {Object.entries(metrics.alertsBySeverity).map(([severity, count]) => (
          <div
            key={severity}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #e1e3e5",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Badge
                tone={
                  severity === "critical"
                    ? "critical"
                    : severity === "high"
                      ? "warning"
                      : "info"
                }
              >
                {severity}
              </Badge>
            </div>
            <Text variant="bodyMd" as="span">
              {count}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );

  const renderReasonBreakdown = () => {
    const headings = ["Reason", "Count", "Percentage"];
    const totalAlerts = Object.values(metrics.alertsByReason).reduce(
      (sum, count) => sum + count,
      0,
    );
    const rows = Object.entries(metrics.alertsByReason).map(
      ([reason, count]) => [
        reason,
        count.toString(),
        `${((count / totalAlerts) * 100).toFixed(1)}%`,
      ],
    );

    return (
      <Card>
        <div style={{ padding: "16px" }}>
          <Text variant="headingMd" as="h3">
            Alerts by Reason
          </Text>
        </div>
        <DataTable
          columns={headings.map((heading, index) => ({
            key: `col-${index}`,
            title: heading,
            sortable: true,
          }))}
          rows={rows.map((row, index) => ({
            id: `row-${index}`,
            ...row.reduce(
              (acc, cell, cellIndex) => ({
                ...acc,
                [`col-${cellIndex}`]: cell,
              }),
              {},
            ),
          }))}
          sortable
        />
      </Card>
    );
  };
  renderReasonBreakdown.displayName = "renderReasonBreakdown";

  const renderNotificationMetrics = () => (
    <Card>
      <div style={{ padding: "16px" }}>
        <Text variant="headingMd" as="h3">
          Notification Success Rates
        </Text>
      </div>
      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid #e1e3e5",
          }}
        >
          <Text variant="bodyMd" as="span">
            Email
          </Text>
          <Text variant="bodyMd" as="span">
            {metrics.notificationSuccessRate.email}%
          </Text>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid #e1e3e5",
          }}
        >
          <Text variant="bodyMd" as="span">
            SMS
          </Text>
          <Text variant="bodyMd" as="span">
            {metrics.notificationSuccessRate.sms}%
          </Text>
        </div>
      </div>
    </Card>
  );

  // Removed unused renderResolutionMetrics function

  const renderExportModal = () => (
    <Modal
      isOpen={showExportModal}
      title="Export Analytics"
      primaryAction={{
        content: "Export",
        onAction: handleExport,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => setShowExportModal(false),
        },
      ]}
      onClose={() => setShowExportModal(false)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Text variant="bodyMd" as="p">
          Choose the format for exporting your analytics data:
        </Text>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="radio" name="format" value="csv" defaultChecked />
            <Text variant="bodyMd" as="span">
              CSV (Excel compatible)
            </Text>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="radio" name="format" value="json" />
            <Text variant="bodyMd" as="span">
              JSON (API format)
            </Text>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="radio" name="format" value="pdf" />
            <Text variant="bodyMd" as="span">
              PDF (Report format)
            </Text>
          </label>
        </div>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div
        data-testid="analytics-dashboard"
        style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
      >
        <Spinner data-testid="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="analytics-dashboard"
        style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
      >
        <div
          data-testid="layout"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <Text variant="headingLg" as="h1">
            Analytics Dashboard
          </Text>
        </div>
        <Card>
          <div style={{ padding: "20px", textAlign: "center" }}>
            <Text variant="headingMd" as="h3" tone="critical">
              {error}
            </Text>
            <div style={{ marginTop: "16px" }}>
              <Button onClick={handleRefresh}>Try Again</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
      data-testid="analytics-dashboard"
    >
      <div
        data-testid="layout"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Text variant="headingLg" as="h1">
          Analytics Dashboard
        </Text>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="date"
              data-testid="date-start"
              value={dateRange?.start || ""}
              onChange={(e) =>
                handleDateRangeChange(e.target.value, dateRange?.end || "")
              }
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <span>to</span>
            <input
              type="date"
              data-testid="date-end"
              value={dateRange?.end || ""}
              onChange={(e) =>
                handleDateRangeChange(dateRange?.start || "", e.target.value)
              }
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>
          <Button data-testid="button" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button data-testid="button" onClick={() => setShowExportModal(true)}>
            Export Data
          </Button>
          <Button
            data-testid="button"
            onClick={() => setShowSettingsModal(true)}
          >
            Settings
          </Button>
        </div>
      </div>

      {renderOverviewCards()}

      <Tabs
        data-testid="tabs"
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "16px",
                }}
              >
                {renderSeverityBreakdown()}
                {renderNotificationMetrics()}
                {renderReasonBreakdown()}
              </div>
            ),
          },
          {
            id: "alerts",
            label: "Alerts",
            content: (
              <div>
                <div
                  style={{
                    marginBottom: "16px",
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                  }}
                >
                  <select
                    data-testid="select"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    style={{
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="all">All Severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <DataTable
                  columns={[
                    { key: "order_number", title: "Order Number" },
                    { key: "customer_name", title: "Customer" },
                    { key: "delay_days", title: "Delay Days" },
                    { key: "severity", title: "Severity" },
                  ]}
                  data={filteredAlerts}
                />
              </div>
            ),
          },
        ]}
        activeTab="overview"
        onTabChange={(tabId) => {
          const tabIndex = ["overview", "alerts"].indexOf(tabId);
          if (tabIndex !== -1) {
            handleTabChange(tabIndex);
          }
        }}
      />

      {renderExportModal()}

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Settings"
      >
        <div style={{ padding: "20px" }}>
          <Text variant="headingMd">Dashboard Settings</Text>
          <p>Configure your analytics dashboard preferences here.</p>
        </div>
      </Modal>

      {showToast && <Toast message={toastMessage} onClose={handleCloseToast} />}
    </div>
  );
}

AnalyticsDashboard.displayName = "AnalyticsDashboard";

export default AnalyticsDashboard;
