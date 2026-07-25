import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppHeader } from "./layout/AppHeader";
import { TabNavigation } from "./layout/TabNavigation";
import { ErrorAlert } from "./common/ErrorAlert";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import {
  DashboardTabWithSuspense,
  AlertsTabWithSuspense,
  OrdersTabWithSuspense,
} from "./tabs/LazyTabs";
import {
  useDelayAlerts,
  useOrders,
  useSettings,
  useTabs,
  useAlertActions,
  useOrderActions,
  useSettingsActions,
} from "../hooks";
import { useApiClient } from "../hooks/useApiClient";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { initializeApp, fetchDashboardStats } from "../store/slices/appSlice";
import { AppSettings, StatsData } from "../types";
import styles from "./RefactoredApp.module.css";

export function RefactoredAppOptimized() {
  // G2: mount the authenticated API client FIRST — this hands the App
  // Bridge instance to the apiClient singleton so every thunk dispatched
  // by the data hooks below carries a session token.
  useApiClient();

  const dispatch = useAppDispatch();

  // Custom hooks for data and state management
  const { selectedTab, changeTab } = useTabs();
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useDelayAlerts();
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();
  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
  } = useSettings();

  // Action hooks
  const { resolveAlert, dismissAlert, reopenAlert } = useAlertActions();
  const { trackOrder, viewOrderDetails } = useOrderActions();
  const { saveSettings, testDelayDetection, connectToShopify } =
    useSettingsActions();

  // G2: shop + stats come from the real API via Redux (appSlice).
  const shop = useAppSelector((state) => state.app.shop);
  const apiStats = useAppSelector((state) => state.app.stats);

  // Local state
  const [error, setError] = useState<string | null>(null);

  // Header stats: /api/analytics when available, otherwise derived live
  // from the fetched alerts (all real data — no fabricated metrics).
  const stats = useMemo<StatsData>(
    () =>
      apiStats ?? {
        totalAlerts: alerts.length,
        activeAlerts: alerts.filter((a) => a.status === "active").length,
        resolvedAlerts: alerts.filter((a) => a.status === "resolved").length,
      },
    [apiStats, alerts],
  );

  // Combined loading state
  const loading = useMemo(
    () => Boolean(alertsLoading || ordersLoading || settingsLoading),
    [alertsLoading, ordersLoading, settingsLoading],
  );

  // Combined error state
  const combinedError = useMemo(
    () => error || alertsError || ordersError || settingsError,
    [error, alertsError, ordersError, settingsError],
  );

  // G2: resolve the real shop + analytics from the backend on mount.
  useEffect(() => {
    dispatch(initializeApp());
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  // Memoized handler functions
  const handleSaveSettings = useCallback(async() => {
    if (settings) {
      await saveSettings(settings);
    }
  }, [settings, saveSettings]);

  const handleTestDelayDetection = useCallback(async() => {
    await testDelayDetection();
  }, [testDelayDetection]);

  const handleConnectShopify = useCallback(async() => {
    // appSlice.connectShopify re-verifies the session and stores the
    // real shop domain — no hardcoded fallback.
    await connectToShopify();
  }, [connectToShopify]);

  const handleAlertAction = useCallback(
    async(alertId: string, action: string) => {
      if (action === "resolve") {
        await resolveAlert(alertId);
      } else if (action === "dismiss") {
        await dismissAlert(alertId);
      } else if (action === "reopen") {
        await reopenAlert(alertId);
      }
    },
    [resolveAlert, dismissAlert, reopenAlert],
  );

  const handleOrderAction = useCallback(
    async(orderId: string, action: string) => {
      if (action === "track") {
        await trackOrder(orderId);
      } else {
        await viewOrderDetails(orderId);
      }
    },
    [trackOrder, viewOrderDetails],
  );

  const handleSettingsChange = useCallback(
    async(newSettings: AppSettings) => {
      await saveSettings(newSettings);
    },
    [saveSettings],
  );

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  // Memoized tab content to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
    switch (selectedTab) {
      case 0:
        return (
          <div data-testid="settings-tab">
            <DashboardTabWithSuspense
              shop={shop}
              settings={settings}
              loading={Boolean(loading ?? false)}
              onSaveSettings={handleSaveSettings}
              onTestDelayDetection={handleTestDelayDetection}
              onConnectShopify={handleConnectShopify}
              onSettingsChange={handleSettingsChange}
            />
          </div>
        );
      case 1:
        return (
          <div data-testid="alerts-tab">
            <AlertsTabWithSuspense
              alerts={alerts}
              loading={Boolean(loading ?? false)}
              onAlertAction={handleAlertAction}
            />
          </div>
        );
      case 2:
        return (
          <div data-testid="orders-tab">
            <OrdersTabWithSuspense
              orders={orders}
              loading={Boolean(loading ?? false)}
              onOrderAction={handleOrderAction}
            />
          </div>
        );
      default:
        return null;
    }
  }, [
    selectedTab,
    shop,
    settings,
    loading,
    alerts,
    orders,
    handleSaveSettings,
    handleTestDelayDetection,
    handleConnectShopify,
    handleSettingsChange,
    handleAlertAction,
    handleOrderAction,
  ]);

  if (loading) {
    return (
      <div className={styles.app}>
        <LoadingSpinner overlay message="Loading DelayGuard..." />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <AppHeader stats={stats} loading={loading} shop={shop} />

      <div className={styles.content}>
        <ErrorAlert error={combinedError} onDismiss={handleErrorDismiss} />

        <TabNavigation
          selectedTab={selectedTab}
          onTabChange={changeTab}
          loading={loading}
        />

        {tabContent}
      </div>
    </div>
  );
}
