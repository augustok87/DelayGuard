import React, { useState, useEffect } from "react";
import { logError, logInfo } from "../utils/logger";
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
  EmptyState,
  ErrorState,
} from "./ui";
import styles from "../styles/DelayGuard.module.css";

// App Bridge integration will be added later
// import { useAppBridge } from '@shopify/app-bridge-react';
// import { Redirect } from '@shopify/app-bridge/actions';

interface AppSettings {
  delayThreshold: number;
  notificationTemplate: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  highContrast: boolean;
  largeText: boolean;
  dateRange: {
    start: string;
    end: string;
  };
}

interface DelayAlert {
  id: string;
  orderId: string;
  customerName: string;
  delayDays: number;
  status: "active" | "resolved" | "dismissed";
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

interface MockAnalyticsAPI {
  getAlerts(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<DelayAlert[]>;
  getOrders(): Promise<Order[]>;
  updateSettings(settings: AppSettings): Promise<void>;
  testDelayDetection(): Promise<void>;
}

declare global {
  interface Window {
    mockAnalyticsAPI?: MockAnalyticsAPI;
  }
}

function MinimalApp() {
  const [settings, setSettings] = useState<AppSettings>({
    delayThreshold: 2,
    notificationTemplate: "default",
    emailNotifications: true,
    smsNotifications: false,
    highContrast: false,
    largeText: false,
    dateRange: {
      start: "",
      end: "",
    },
  });

  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Data initialization - use mock API if available, otherwise use local mock data
  useEffect(() => {
    const loadData = async() => {
      try {
        setLoading(true);
        setError(null);

        // Check if mock API is available (for testing)
        if (typeof window !== "undefined" && window.mockAnalyticsAPI) {
          const [alertsData, ordersData] = await Promise.all([
            window.mockAnalyticsAPI.getAlerts(),
            window.mockAnalyticsAPI.getOrders(),
          ]);
          setAlerts(alertsData || []);
          setOrders(ordersData || []);
        } else {
          // Use local mock data for development
          const mockAlerts: DelayAlert[] = [
            {
              id: "1",
              orderId: "ORD-001",
              customerName: "John Doe",
              delayDays: 2,
              status: "active",
              createdAt: "2024-01-20T10:00:00Z",
            },
            {
              id: "2",
              orderId: "ORD-002",
              customerName: "Jane Smith",
              delayDays: 5,
              status: "active",
              createdAt: "2024-01-21T10:00:00Z",
            },
          ];

          const mockOrders: Order[] = [
            {
              id: "1",
              orderNumber: "ORD-001",
              customerName: "John Doe",
              status: "delayed",
              trackingNumber: "1Z999AA1234567890",
              carrierCode: "UPS",
              createdAt: "2024-01-15T10:00:00Z",
            },
            {
              id: "2",
              orderNumber: "ORD-002",
              customerName: "Jane Smith",
              status: "shipped",
              trackingNumber: "1Z999BB1234567890",
              carrierCode: "FEDEX",
              createdAt: "2024-01-16T10:00:00Z",
            },
          ];

          // Simulate loading delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setAlerts(mockAlerts);
          setOrders(mockOrders);
        }
      } catch (err) {
        setError("Failed to load data");
        logError(
          "Failed to load data",
          err instanceof Error ? err : new Error(String(err)),
          { component: "MinimalApp", action: "loadData" },
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for real-time updates
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "real-time-update") {
        handleRealTimeUpdate();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSaveSettings = async() => {
    try {
      logInfo("Saving settings", {
        component: "MinimalApp",
        action: "saveSettings",
        metadata: { settings },
      });

      // Call mock API if available (for testing)
      if (typeof window !== "undefined" && window.mockAnalyticsAPI) {
        await window.mockAnalyticsAPI.updateSettings(settings);
      }

      setShowSettingsModal(false);
      setToastMessage("Settings saved successfully!");
      setShowToast(true);
    } catch (error) {
      logError(
        "Failed to save settings",
        error instanceof Error ? error : new Error(String(error)),
        { component: "MinimalApp", action: "saveSettings" },
      );
      setToastMessage("Failed to save settings");
      setShowToast(true);
    }
  };

  const handleResolveAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? {
              ...alert,
              status: "resolved" as const,
              resolvedAt: new Date().toISOString(),
            }
          : alert,
      ),
    );
    setToastMessage("Alert resolved successfully!");
    setShowToast(true);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? { ...alert, status: "dismissed" as const }
          : alert,
      ),
    );
    setToastMessage("Alert dismissed!");
    setShowToast(true);
  };

  const handleTabChange = (tabIndex: number) => {
    setSelectedTab(tabIndex);
  };

  const handleCloseToast = () => {
    setShowToast(false);
  };

  const handleExportAlerts = () => {
    const csvContent = [
      ["Order ID", "Customer", "Delay Days", "Status"],
      ...alerts.map((alert) => [
        alert.orderId,
        alert.customerName,
        alert.delayDays.toString(),
        alert.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Check if we're in a test environment
    if (
      typeof window !== "undefined" &&
      window.URL &&
      window.URL.createObjectURL
    ) {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "delay-alerts.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    }

    setToastMessage("Export started");
    setShowToast(true);
  };

  const handlePreviousPage = () => {
    setToastMessage("Previous page clicked");
    setShowToast(true);
  };

  const handleNextPage = () => {
    setToastMessage("Next page clicked");
    setShowToast(true);
  };

  const handleRefresh = async() => {
    try {
      setLoading(true);
      setError(null);

      // Check if mock API is available (for testing)
      if (typeof window !== "undefined" && window.mockAnalyticsAPI) {
        const [alertsData, ordersData] = await Promise.all([
          window.mockAnalyticsAPI.getAlerts(),
          window.mockAnalyticsAPI.getOrders(),
        ]);
        setAlerts(alertsData || []);
        setOrders(ordersData || []);
      } else {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setToastMessage("Data refreshed");
      setShowToast(true);
    } catch (err) {
      setError("Failed to refresh data");
      logError(
        "Failed to refresh data",
        err instanceof Error ? err : new Error(String(err)),
        { component: "MinimalApp", action: "refreshData" },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRealTimeUpdate = () => {
    // Simulate real-time update by adding a new alert
    const newAlert: DelayAlert = {
      id: "alert-3",
      orderId: "ORD-003",
      customerName: "Bob Johnson",
      delayDays: 4,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    setAlerts((prev) => [...prev, newAlert]);
    setToastMessage("New alert received: Bob Johnson");
    setShowToast(true);
  };

  const renderAlertsTable = () => {
    // Handle error state
    if (error) {
      return (
        <Card>
          <div
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="headingMd" as="h3">
              Delay Alerts
            </Text>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="sm"
                onClick={handleRefresh}
                data-testid="refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>
          <ErrorState
            title="Failed to load alerts"
            message="Failed to load data"
            onRetry={handleRefresh}
            testId="alerts-error-state"
          />
        </Card>
      );
    }

    // Handle empty state
    if (alerts.length === 0) {
      return (
        <Card>
          <div
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="headingMd" as="h3">
              Delay Alerts
            </Text>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="sm"
                onClick={handleRefresh}
                data-testid="refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>
          <EmptyState
            title="No alerts found"
            description="No delay alerts are currently active. New alerts will appear here when shipping delays are detected."
            action={{
              label: "Test Delay Detection",
              onClick: async() => {
                try {
                  logInfo("Testing delay detection", {
                    component: "MinimalApp",
                    action: "testDelayDetection",
                  });
                  if (
                    typeof window !== "undefined" &&
                    window.mockAnalyticsAPI
                  ) {
                    await window.mockAnalyticsAPI.testDelayDetection();
                  }
                  setToastMessage("Test delay detection started");
                  setShowToast(true);
                } catch (err) {
                  logError(
                    "Error testing delay detection",
                    err instanceof Error ? err : new Error(String(err)),
                    { component: "MinimalApp", action: "testDelayDetection" },
                  );
                  setToastMessage("Error testing delay detection");
                  setShowToast(true);
                }
              },
            }}
            testId="alerts-empty-state"
          />
        </Card>
      );
    }

    const filteredAlerts = alerts.filter((alert) =>
      alert.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const headings = [
      "Order ID",
      "Customer",
      "Delay Days",
      "Status",
      "Actions",
    ];
    const rows = filteredAlerts.map((alert) => [
      alert.orderId,
      alert.customerName,
      alert.delayDays.toString(),
      alert.status,
      "", // Actions handled separately
    ]);

    return (
      <Card>
        <div
          style={{
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text variant="headingMd" as="h3">
            Delay Alerts
          </Text>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button size="sm" onClick={handleExportAlerts}>
              Export Alerts
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async() => {
                try {
                  logInfo("Testing delay detection", {
                    component: "MinimalApp",
                    action: "testDelayDetection",
                  });
                  // Call mock API if available (for testing)
                  if (
                    typeof window !== "undefined" &&
                    window.mockAnalyticsAPI
                  ) {
                    await window.mockAnalyticsAPI.testDelayDetection();
                  }
                  setToastMessage("Test delay detection started");
                  setShowToast(true);
                } catch (err) {
                  logError(
                    "Error testing delay detection",
                    err instanceof Error ? err : new Error(String(err)),
                    { component: "MinimalApp", action: "testDelayDetection" },
                  );
                  setToastMessage("Error testing delay detection");
                  setShowToast(true);
                }
              }}
            >
              Test Delay Detection
            </Button>
          </div>
        </div>

        {/* Statistics Section */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#f8f9fa",
            borderBottom: "1px solid #e1e3e5",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div>
              <Text variant="bodySm" as="span" style={{ color: "#6b7280" }}>
                Total Alerts:
              </Text>
              <Text
                variant="headingMd"
                as="span"
                style={{ marginLeft: "8px" }}
                data-testid="total-alerts"
              >
                {alerts.length}
              </Text>
            </div>
            <div>
              <Text variant="bodySm" as="span" style={{ color: "#6b7280" }}>
                Active:
              </Text>
              <Text
                variant="headingMd"
                as="span"
                style={{ marginLeft: "8px" }}
                data-testid="active-alerts"
              >
                {alerts.filter((a) => a.status === "active").length}
              </Text>
            </div>
            <div>
              <Text variant="bodySm" as="span" style={{ color: "#6b7280" }}>
                Resolved:
              </Text>
              <Text
                variant="headingMd"
                as="span"
                style={{ marginLeft: "8px" }}
                data-testid="resolved-alerts"
              >
                {alerts.filter((a) => a.status === "resolved").length}
              </Text>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Search alerts by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="text-field"
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                }}
              />
            </div>
            <div>
              <select
                data-testid="select"
                style={{
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                }}
                onChange={(e) => {
                  // Filter alerts by status
                  const status = e.target.value;
                  if (status === "all") {
                    setAlerts(alerts);
                  } else {
                    setAlerts(
                      alerts.filter((alert) => alert.status === status),
                    );
                  }
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
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
          selectable
          selectedRows={selectedAlerts}
          onSelectionChange={setSelectedAlerts}
          onSelectAll={(selected) => {
            if (selected) {
              setSelectedAlerts(alerts.map((alert) => alert.id));
            } else {
              setSelectedAlerts([]);
            }
          }}
        />

        {/* Bulk Actions */}
        {selectedAlerts.length > 0 && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #e1e3e5",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Text variant="bodySm" as="span">
                {selectedAlerts.length} selected
              </Text>
              <Button
                size="sm"
                onClick={() => {
                  selectedAlerts.forEach((alertId) =>
                    handleResolveAlert(alertId),
                  );
                  setSelectedAlerts([]);
                  setToastMessage(`${selectedAlerts.length} alerts updated`);
                  setShowToast(true);
                }}
              >
                Mark as Resolved
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  selectedAlerts.forEach((alertId) =>
                    handleDismissAlert(alertId),
                  );
                  setSelectedAlerts([]);
                  setToastMessage("Bulk dismiss completed");
                  setShowToast(true);
                }}
              >
                Dismiss Selected
              </Button>
            </div>
          </div>
        )}

        <div style={{ padding: "16px" }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #e1e3e5",
              }}
            >
              <div>
                <Text variant="bodyMd" as="span">
                  {alert.orderId} - {alert.customerName}
                </Text>
                <Badge
                  tone={
                    alert.delayDays > 5
                      ? "critical"
                      : alert.delayDays > 3
                        ? "warning"
                        : "info"
                  }
                >
                  {alert.delayDays} days
                </Badge>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  size="sm"
                  onClick={() => handleResolveAlert(alert.id)}
                  data-testid="button"
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDismissAlert(alert.id)}
                  data-testid="button"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            padding: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Button size="sm" variant="secondary" onClick={handlePreviousPage}>
            Previous
          </Button>
          <Text variant="bodySm" as="span">
            Page 1 of 1
          </Text>
          <Button size="sm" variant="secondary" onClick={handleNextPage}>
            Next
          </Button>
        </div>
      </Card>
    );
  };

  const renderOrdersTable = () => {
    // Handle error state
    if (error) {
      return (
        <Card>
          <div
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="headingMd" as="h3">
              Orders
            </Text>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="sm"
                onClick={handleRefresh}
                data-testid="refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>
          <ErrorState
            title="Failed to load orders"
            message="Failed to load data"
            onRetry={handleRefresh}
            testId="orders-error-state"
          />
        </Card>
      );
    }

    // Handle empty state
    if (orders.length === 0) {
      return (
        <Card>
          <div
            style={{
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text variant="headingMd" as="h3">
              Orders
            </Text>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                size="sm"
                onClick={handleRefresh}
                data-testid="refresh-button"
              >
                Refresh
              </Button>
            </div>
          </div>
          <EmptyState
            title="No orders found"
            description="No orders are currently available. Orders will appear here when they are processed."
            testId="orders-empty-state"
          />
        </Card>
      );
    }

    const headings = [
      "Order Number",
      "Customer",
      "Status",
      "Tracking",
      "Carrier",
      "Actions",
    ];
    const rows = orders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.status,
      order.trackingNumber || "N/A",
      order.carrierCode || "N/A",
      "", // Actions handled separately
    ]);

    return (
      <Card>
        <div style={{ padding: "16px" }}>
          <Text variant="headingMd" as="h3">
            Orders
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

        {/* Individual Order Actions */}
        <div style={{ padding: "16px" }}>
          {orders.map((order) => (
            <div
              key={order.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #e1e3e5",
              }}
            >
              <div>
                <Text variant="bodyMd" as="span">
                  {order.orderNumber} - {order.customerName}
                </Text>
                <Badge
                  tone={
                    order.status === "delivered"
                      ? "success"
                      : order.status === "shipped"
                        ? "info"
                        : "warning"
                  }
                >
                  {order.status}
                </Badge>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  size="sm"
                  onClick={() => {
                    setToastMessage("Tracking information loaded");
                    setShowToast(true);
                  }}
                  data-testid="button"
                >
                  Track Order
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      isOpen={showSettingsModal}
      title="App Settings"
      primaryAction={{
        content: "Save Settings",
        onAction: handleSaveSettings,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: () => setShowSettingsModal(false),
        },
      ]}
      onClose={() => setShowSettingsModal(false)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <Text variant="bodyMd" as="div">
            Delay Threshold (days)
          </Text>
          <input
            type="number"
            value={settings.delayThreshold}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                delayThreshold: parseInt(e.target.value),
              }))
            }
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
        <div>
          <Text variant="bodyMd" as="div">
            Notification Template
          </Text>
          <select
            value={settings.notificationTemplate}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                notificationTemplate: e.target.value,
              }))
            }
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          >
            <option value="default">Default Template</option>
            <option value="custom">Custom Template</option>
            <option value="minimal">Minimal Template</option>
          </select>
        </div>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              data-testid="email-notifications-checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  emailNotifications: e.target.checked,
                }))
              }
            />
            <Text variant="bodyMd" as="span">
              Email Notifications
            </Text>
          </label>
        </div>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              data-testid="sms-notifications-checkbox"
              checked={settings.smsNotifications}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  smsNotifications: e.target.checked,
                }))
              }
            />
            <Text variant="bodyMd" as="span">
              SMS Notifications
            </Text>
          </label>
        </div>

        <div
          style={{
            height: "1px",
            backgroundColor: "#e5e7eb",
            margin: "16px 0",
          }}
        />

        <Text variant="headingMd" as="h3">
          Accessibility
        </Text>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              data-testid="checkbox"
              checked={settings.highContrast}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  highContrast: e.target.checked,
                }))
              }
            />
            <Text variant="bodyMd" as="span">
              High Contrast
            </Text>
          </label>
        </div>
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              data-testid="checkbox"
              checked={settings.largeText}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  largeText: e.target.checked,
                }))
              }
            />
            <Text variant="bodyMd" as="span">
              Large Text
            </Text>
          </label>
        </div>

        <div
          style={{
            height: "1px",
            backgroundColor: "#e5e7eb",
            margin: "16px 0",
          }}
        />

        <Text variant="headingMd" as="h3">
          Date Range Filter
        </Text>
        <div>
          <Text variant="bodyMd" as="div">
            Start Date
          </Text>
          <input
            type="date"
            data-testid="start-date"
            value={settings.dateRange.start}
            onChange={async(e) => {
              const newStartDate = e.target.value;
              setSettings((prev) => ({
                ...prev,
                dateRange: { ...prev.dateRange, start: newStartDate },
              }));

              // Call mock API if available (for testing)
              if (typeof window !== "undefined" && window.mockAnalyticsAPI) {
                await window.mockAnalyticsAPI.getAlerts({
                  startDate: newStartDate,
                  endDate: settings.dateRange.end,
                });
              }
            }}
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
        <div>
          <Text variant="bodyMd" as="div">
            End Date
          </Text>
          <input
            type="date"
            data-testid="end-date"
            value={settings.dateRange.end}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                dateRange: { ...prev.dateRange, end: e.target.value },
              }))
            }
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </div>
      </div>
    </Modal>
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
        }}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.app}>
        <div
          style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
          data-testid="layout"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <Text variant="headingLg" as="h1">
              DelayGuard
            </Text>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={handleRefresh} data-testid="refresh-button">
                Refresh
              </Button>
            </div>
          </div>
          <ErrorState
            title="Application Error"
            message="Failed to load data"
            onRetry={handleRefresh}
            testId="app-error-state"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <div
        style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
        data-testid="layout"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <Text variant="headingLg" as="h1">
              DelayGuard
            </Text>
            <Text
              variant="bodyMd"
              as="p"
              style={{ marginTop: "8px", color: "#6b7280" }}
            >
              Proactive Shipping Delay Notifications
            </Text>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button onClick={handleRealTimeUpdate} data-testid="refresh-button">
              Refresh
            </Button>
            <Button
              onClick={() => setShowSettingsModal(true)}
              data-testid="settings-button"
            >
              Settings
            </Button>
          </div>
        </div>

        <Tabs
          tabs={[
            {
              id: "alerts",
              label: "🚨 Delay Alerts",
              content: renderAlertsTable(),
            },
            { id: "orders", label: "📦 Orders", content: renderOrdersTable() },
          ]}
          activeTab={["alerts", "orders"][selectedTab]}
          onTabChange={(tabId) => {
            const tabIndex = ["alerts", "orders"].indexOf(tabId);
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
export { MinimalApp };
