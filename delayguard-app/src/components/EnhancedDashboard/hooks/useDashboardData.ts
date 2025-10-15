// Custom hook for managing dashboard data
import { useState, useEffect, useCallback } from 'react';
import { DelayAlert, Order, AppSettings, StatsData } from '../../../types';
import { mockAlerts, mockOrders, mockSettings, mockStats } from '../mockData';

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
  // State management
  const [settings, setSettings] = useState<AppSettings>(propSettings || mockSettings);
  const [alerts, setAlerts] = useState<DelayAlert[]>(propAlerts || []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatsData>(propStats || mockStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  // Initialize data if not provided via props
  useEffect(() => {
    if (propAlerts !== undefined) return; // Don't override props
    
    setAlerts(mockAlerts);
    setOrders(mockOrders);
    setLoading(false);
  }, [propAlerts]);

  // Event handlers
  const handleSaveSettings = useCallback(() => {
    if (propOnSave) {
      propOnSave();
    } else {
      setShowSettings(false);
      setToastMessage('Settings saved successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [propOnSave]);

  const handleResolveAlert = useCallback((alertId: string) => {
    if (propOnAlertAction) {
      propOnAlertAction(alertId, 'resolve');
    } else {
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved' } : alert,
      ));
      setToastMessage('Alert resolved successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [propOnAlertAction]);

  const handleDismissAlert = useCallback((alertId: string) => {
    if (propOnAlertAction) {
      propOnAlertAction(alertId, 'dismiss');
    } else {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setToastMessage('Alert dismissed successfully!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [propOnAlertAction]);

  const handleTest = useCallback(() => {
    if (propOnTest) {
      propOnTest();
    } else {
      setToastMessage('Test functionality triggered!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [propOnTest]);

  const handleConnect = useCallback(() => {
    if (propOnConnect) {
      propOnConnect();
    } else {
      setToastMessage('Connect functionality triggered!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [propOnConnect]);

  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    if (propOnSettingsChange) {
      propOnSettingsChange(newSettings);
    } else {
      setSettings(newSettings);
    }
  }, [propOnSettingsChange]);

  const handleTabChange = useCallback((tabId: string) => {
    const tabIndex = ['alerts', 'orders', 'analytics'].indexOf(tabId);
    if (tabIndex !== -1) {
      setSelectedTab(tabIndex);
    }
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
    
    // Setters
    setSettings,
    setAlerts,
    setOrders,
    setStats,
    setLoading,
    setError,
    setShowSettings,
    setShowToast,
    setToastMessage,
    setSelectedTab,
    
    // Handlers
    handleSaveSettings,
    handleResolveAlert,
    handleDismissAlert,
    handleTest,
    handleConnect,
    handleSettingsChange,
    handleTabChange,
  };
};
