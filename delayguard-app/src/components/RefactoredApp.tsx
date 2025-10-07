import React, { useState, useEffect } from 'react';
import { AppHeader } from './layout/AppHeader';
import { TabNavigation } from './layout/TabNavigation';
import { ErrorAlert } from './common/ErrorAlert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { DashboardTab } from './tabs/DashboardTab';
import { AlertsTab } from './tabs/AlertsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { 
  useDelayAlerts, 
  useOrders, 
  useSettings, 
  useTabs, 
  useAlertActions, 
  useOrderActions, 
  useSettingsActions 
} from '../hooks';
import { AppSettings, DelayAlert, Order, StatsData } from '../types';
import styles from './RefactoredApp.module.css';

export function RefactoredApp() {
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

  // Mock statistics for the dashboard
  const [stats, setStats] = useState<StatsData>({
    totalAlerts: 12,
    activeAlerts: 3,
    resolvedAlerts: 9,
    avgResolutionTime: '2.3 days',
    customerSatisfaction: '94%',
    supportTicketReduction: '35%'
  });

  // Combined loading state
  const loading = alertsLoading || ordersLoading || settingsLoading;

  // Initialize shop data
  useEffect(() => {
    setShop('my-awesome-store.myshopify.com');
  }, []);

  const handleSaveSettings = async () => {
    if (settings) {
      await saveSettings(settings);
    }
  };

  const handleTestDelayDetection = async () => {
    await testDelayDetection();
  };

  const handleConnectShopify = async () => {
    const result = await connectToShopify();
    if (result.success) {
      setShop('my-awesome-store.myshopify.com');
    }
  };

  const handleAlertAction = async (alertId: string, action: 'resolve' | 'dismiss') => {
    if (action === 'resolve') {
      await resolveAlert(alertId);
    } else {
      await dismissAlert(alertId);
    }
  };

  const handleOrderAction = async (orderId: string, action: 'track' | 'view') => {
    if (action === 'track') {
      await trackOrder(orderId);
    } else {
      await viewOrderDetails(orderId);
    }
  };

  const handleSettingsChange = async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
  };

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
          error={error} 
          onDismiss={() => setError(null)} 
        />

        <TabNavigation 
          selectedTab={selectedTab}
          onTabChange={changeTab}
          loading={loading}
        />

        {/* Dashboard Tab */}
        {selectedTab === 0 && (
          <DashboardTab
            shop={shop}
            settings={settings}
            stats={stats}
            loading={loading}
            onSaveSettings={handleSaveSettings}
            onTestDelayDetection={handleTestDelayDetection}
            onConnectShopify={handleConnectShopify}
            onSettingsChange={handleSettingsChange}
          />
        )}

        {/* Delay Alerts Tab */}
        {selectedTab === 1 && (
          <AlertsTab
            alerts={alerts}
            loading={loading}
            onAlertAction={handleAlertAction}
          />
        )}

        {/* Orders Tab */}
        {selectedTab === 2 && (
          <OrdersTab
            orders={orders}
            loading={loading}
            onOrderAction={handleOrderAction}
          />
        )}
      </div>
    </div>
  );
}

export default RefactoredApp;
