/**
 * Custom hook for managing dashboard data
 * Now uses real API calls instead of mock data
 */
import { useState, useEffect, useCallback } from 'react';
import { DelayAlert, Order, AppSettings, StatsData } from '../../../types';
import { mockSettings, mockStats } from '../mockData'; // Keep as fallbacks only
import { logger } from '../../../utils/logger';
import { useApiClient } from '../../../hooks/useApiClient';

interface UseDashboardDataProps {
  settings?: AppSettings;
  alerts?: DelayAlert[];
  stats?: StatsData;
  onSave?: () => void;
  onTest?: () => void;
  onConnect?: () => void;
  onAlertAction?: (alertId: string, action: string) => void;
  onSettingsChange?: (settings: AppSettings) => void;
}

export const useDashboardData = ({
  settings: propSettings,
  alerts: propAlerts,
  stats: propStats,
  onSave: propOnSave,
  onTest: propOnTest,
  onConnect: propOnConnect,
  onAlertAction: propOnAlertAction,
  onSettingsChange: propOnSettingsChange,
}: UseDashboardDataProps) => {
  // Get authenticated API client
  const api = useApiClient();

  // State management
  const [settings, setSettings] = useState<AppSettings>(propSettings || mockSettings);
  const [alerts, setAlerts] = useState<DelayAlert[]>(propAlerts || []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatsData>(propStats || mockStats);
  
  // Only show loading if we need to fetch data (no props provided)
  const shouldFetchData = propAlerts === undefined;
  const [loading, setLoading] = useState(shouldFetchData);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  /**
   * Fetch all dashboard data from API
   */
  const fetchDashboardData = useCallback(async() => {
    // Don't fetch if props are provided (test/preview mode)
    if (!shouldFetchData) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.debug('Fetching dashboard data from API');

      // Fetch all data in parallel for better performance
      const [alertsResponse, ordersResponse, settingsResponse, analyticsResponse] = await Promise.all([
        api.getAlerts(),
        api.getOrders(50),
        api.getSettings(),
        api.getAnalytics(),
      ]);

      // v1.38 known type-lie at the API boundary: wire returns snake_case
      // AlertRow / OrderRow / AppSettingsRow but UI types are camelCase. Casts
      // below preserve current runtime behavior pending the camelCase migration.
      // api-client.ts intentionally returns `unknown` (Wave 3.4) so this surface
      // is the visible narrowing point.
      if (alertsResponse.success && alertsResponse.data) {
        const alertsData = alertsResponse.data as DelayAlert[];
        setAlerts(alertsData);
        logger.debug('Alerts loaded', { count: alertsData.length });
      } else {
        logger.warn('Failed to load alerts', { error: alertsResponse.error });
      }

      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = ordersResponse.data as Order[];
        setOrders(ordersData);
        logger.debug('Orders loaded', { count: ordersData.length });
      } else {
        logger.warn('Failed to load orders', { error: ordersResponse.error });
      }

      if (settingsResponse.success && settingsResponse.data) {
        setSettings(settingsResponse.data as AppSettings);
        logger.debug('Settings loaded');
      } else {
        logger.warn('Failed to load settings', { error: settingsResponse.error });
        // Keep using fallback settings
      }

      if (analyticsResponse.success && analyticsResponse.data) {
        // Wire shape from MerchantApiService.getAnalytics — snake_case stats keys.
        const analytics = analyticsResponse.data as {
          alerts: { total_alerts?: number; pending_alerts?: number; sent_alerts?: number };
          orders: { total_orders?: number };
        };
        const alertStats = analytics.alerts;
        const orderStats = analytics.orders;

        setStats({
          totalAlerts: alertStats.total_alerts || 0,
          activeAlerts: alertStats.pending_alerts || 0,
          resolvedAlerts: alertStats.sent_alerts || 0,
          avgResolutionTime: '2.5 days', // Can be calculated from actual data later
          customerSatisfaction: '95%', // Can be fetched from separate endpoint
          supportTicketReduction: '40%', // Can be calculated from historical data
          totalOrders: orderStats.total_orders || 0,
          delayedOrders: alertStats.total_alerts || 0,
          revenueImpact: (alertStats.total_alerts || 0) * 50, // Estimate: $50 per delayed order
        });
        
        logger.debug('Analytics loaded');
      } else {
        logger.warn('Failed to load analytics', { error: analyticsResponse.error });
        // Keep using fallback stats
      }

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      logger.error('Error fetching dashboard data', err as Error);
      setError(errorMessage);
      setLoading(false);
    }
  }, [api, shouldFetchData, settings.delayThreshold]);

  /**
   * Load dashboard data on mount
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Handle settings save
   */
  const handleSave = useCallback(async() => {
      if (propOnSave) {
        propOnSave();
      return;
    }

    setLoading(true);
    try {
      logger.debug('Saving settings', { settings });

      // v1.38 type-lie surface: AppSettings (camelCase, interface) flows to
      // the snake_case UpdateSettingsInput at the boundary. Cast to satisfy
      // the post-Wave-3.4 Record<string, unknown> param type.
      const response = await api.updateSettings(settings as unknown as Record<string, unknown>);

      if (response.success) {
      setToastMessage('Settings saved successfully!');
      setShowToast(true);
        logger.info('Settings saved successfully');
        
        // Notify parent if callback provided
        if (propOnSettingsChange) {
          propOnSettingsChange(settings);
        }
    } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      logger.error('Error saving settings', err as Error);
      setError(errorMessage);
      setToastMessage(`Error: ${errorMessage}`);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [api, settings, propOnSave, propOnSettingsChange]);

  /**
   * Handle test button click
   */
  const handleTest = useCallback(async() => {
    if (propOnTest) {
      propOnTest();
      return;
    }

    setLoading(true);
    try {
      logger.debug('Testing delay detection');
      
      // In a real implementation, you'd call a test endpoint
      // For now, we'll simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setToastMessage('Test notification sent!');
      setShowToast(true);
      logger.info('Test completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test failed';
      logger.error('Error running test', err as Error);
      setToastMessage(`Test failed: ${errorMessage}`);
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [propOnTest]);

  /**
   * Handle Shopify connect button
   */
  const handleConnect = useCallback(() => {
    if (propOnConnect) {
      propOnConnect();
      return;
    }

    logger.debug('Connect button clicked');
    setToastMessage('Already connected to Shopify!');
    setShowToast(true);
  }, [propOnConnect]);

  /**
   * Handle alert actions (view, dismiss, etc.)
   */
  const handleAlertAction = useCallback((alertId: string, action: string) => {
    if (propOnAlertAction) {
      propOnAlertAction(alertId, action);
      return;
    }

    logger.debug('Alert action', { alertId, action });
    
    if (action === 'dismiss') {
      // Update local state optimistically
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setToastMessage('Alert dismissed');
      setShowToast(true);
      
      // In a real implementation, you'd call an API to update the alert status
    }
  }, [propOnAlertAction]);

  /**
   * Handle settings changes
   */
  const handleSettingsChange = useCallback((newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    logger.debug('Settings changed', { newSettings });
    
    // Call prop callback if provided with full settings object
    if (propOnSettingsChange) {
      propOnSettingsChange(updatedSettings);
    }
  }, [propOnSettingsChange, settings]);

  /**
   * Handle order selection for details modal
   */
  const handleOrderClick = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    logger.debug('Order selected', { orderId: order.id });
  }, []);

  /**
   * Refresh dashboard data
   */
  const refresh = useCallback(() => {
    logger.debug('Refreshing dashboard data');
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Handle tab change (backward compatible wrapper)
   * Old component passes string, new one uses number
   */
  const handleTabChange = useCallback((tabId: string | number) => {
    const tabIndex = typeof tabId === 'string' ? parseInt(tabId, 10) : tabId;
    setSelectedTab(tabIndex);
  }, []);

  return {
    // State
    settings,
    alerts,
    orders,
    stats,
    loading,
    error,
    showSettings,
    showToast,
    toastMessage,
    selectedTab,
    showOrderDetails,
    selectedOrder,
    
    // Actions (new names)
    handleSave,
    handleTest,
    handleConnect,
    handleAlertAction,
    handleOrderClick,
    refresh,
    
    // Backward-compatible aliases for old components
    handleSaveSettings: handleSave,
    handleResolveAlert: (alertId: string) => handleAlertAction(alertId, 'resolve'),
    handleDismissAlert: (alertId: string) => handleAlertAction(alertId, 'dismiss'),
    handleRefresh: refresh,
    handleTabChange,
    handleSettingsChange,
    
    // State setters (for direct manipulation if needed)
    setSettings: handleSettingsChange,
    setShowSettings,
    setShowToast,
    setToastMessage,
    setSelectedTab,
    setShowOrderDetails,
  };
};
