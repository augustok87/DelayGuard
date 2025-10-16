import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppHeader } from './layout/AppHeader';
import { TabNavigation } from './layout/TabNavigation';
import { ErrorAlert } from './common/ErrorAlert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { DashboardTabWithSuspense, AlertsTabWithSuspense, OrdersTabWithSuspense } from './tabs/LazyTabs';
import { 
  useDelayAlerts, 
  useOrders, 
  useSettings, 
  useTabs, 
  useAlertActions, 
  useOrderActions, 
  useSettingsActions, 
} from '../hooks';
import { AppSettings, StatsData } from '../types';
import styles from './RefactoredApp.module.css';

export function RefactoredAppOptimized() {
  // Custom hooks for data and state management
  const { selectedTab, changeTab } = useTabs();
  const { alerts, loading: alertsLoading, error: alertsError } = useDelayAlerts();
  const { orders, loading: ordersLoading, error: ordersError } = useOrders();
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  
  // Action hooks
  const { resolveAlert, dismissAlert } = useAlertActions();
  const { trackOrder, viewOrderDetails } = useOrderActions();
  const { saveSettings, testDelayDetection, connectToShopify } = useSettingsActions();

  // Local state
  const [shop, setShop] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoized statistics for the dashboard
  const stats = useMemo<StatsData>(() => ({
    totalAlerts: 12,
    activeAlerts: 3,
    resolvedAlerts: 9,
    avgResolutionTime: '2.3 days',
    customerSatisfaction: '94%',
    supportTicketReduction: '35%',
  }), []);

  // Combined loading state
  const loading = useMemo(() => 
    alertsLoading || ordersLoading || settingsLoading,
    [alertsLoading, ordersLoading, settingsLoading],
  );

  // Combined error state
  const combinedError = useMemo(() => 
    error || alertsError || ordersError || settingsError,
    [error, alertsError, ordersError, settingsError],
  );

  // Initialize shop data
  useEffect(() => {
    setShop('my-awesome-store.myshopify.com');
  }, []);

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
    const result = await connectToShopify();
    if (result.success) {
      setShop('my-awesome-store.myshopify.com');
    }
  }, [connectToShopify]);

  const handleAlertAction = useCallback(async(alertId: string, action: 'resolve' | 'dismiss') => {
    if (action === 'resolve') {
      await resolveAlert(alertId);
    } else {
      await dismissAlert(alertId);
    }
  }, [resolveAlert, dismissAlert]);

  const handleOrderAction = useCallback(async(orderId: string, action: 'track' | 'view') => {
    if (action === 'track') {
      await trackOrder(orderId);
    } else {
      await viewOrderDetails(orderId);
    }
  }, [trackOrder, viewOrderDetails]);

  const handleSettingsChange = useCallback(async(newSettings: AppSettings) => {
    await saveSettings(newSettings);
  }, [saveSettings]);

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  // Memoized tab content to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
    switch (selectedTab) {
      case 0:
        return (
          <div data-testid="dashboard-tab">
            <DashboardTabWithSuspense
              shop={shop}
              settings={settings}
              stats={stats}
              loading={loading}
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
              loading={loading}
              onAlertAction={handleAlertAction}
            />
          </div>
        );
      case 2:
        return (
          <div data-testid="orders-tab">
            <OrdersTabWithSuspense
              orders={orders}
              loading={loading}
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
    stats,
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
        <LoadingSpinner 
          overlay 
          message="Loading DelayGuard..." 
        />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <AppHeader stats={stats} loading={loading} />
      
      <div className={styles.content}>
        <ErrorAlert 
          error={combinedError} 
          onDismiss={handleErrorDismiss} 
        />

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
