import React, { useState, useEffect } from 'react';
import { AppHeader } from './layout/AppHeader';
import { TabNavigation } from './layout/TabNavigation';
import { ErrorAlert } from './common/ErrorAlert';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { DashboardTab } from './tabs/DashboardTab';
import { AlertsTab } from './tabs/AlertsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { AppSettings, DelayAlert, Order, StatsData } from '../types';
import styles from './RefactoredApp.module.css';

export function RefactoredApp() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shop, setShop] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    delayThreshold: 2,
    notificationTemplate: 'default',
    emailNotifications: true,
    smsNotifications: false
  });
  const [alerts, setAlerts] = useState<DelayAlert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Mock statistics for the dashboard
  const [stats, setStats] = useState<StatsData>({
    totalAlerts: 12,
    activeAlerts: 3,
    resolvedAlerts: 9,
    avgResolutionTime: '2.3 days',
    customerSatisfaction: '94%',
    supportTicketReduction: '35%'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock shop data
      setShop('my-awesome-store.myshopify.com');
      
      // Mock alerts data
      setAlerts([
        {
          id: '1',
          orderId: '1001',
          customerName: 'John Smith',
          delayDays: 3,
          status: 'active',
          createdAt: '2024-01-15T10:30:00Z',
          customerEmail: 'john.smith@email.com',
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'UPS',
          priority: 'high'
        },
        {
          id: '2',
          orderId: '1002',
          customerName: 'Sarah Johnson',
          delayDays: 5,
          status: 'resolved',
          createdAt: '2024-01-14T14:20:00Z',
          resolvedAt: '2024-01-16T09:15:00Z',
          customerEmail: 'sarah.johnson@email.com',
          trackingNumber: '1Z999BB9876543210',
          carrierCode: 'UPS',
          priority: 'critical'
        },
        {
          id: '3',
          orderId: '1003',
          customerName: 'Mike Wilson',
          delayDays: 2,
          status: 'active',
          createdAt: '2024-01-16T08:45:00Z',
          customerEmail: 'mike.wilson@email.com',
          trackingNumber: '1Z999CC1122334455',
          carrierCode: 'FedEx',
          priority: 'medium'
        }
      ]);
      
      // Mock orders data
      setOrders([
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Smith',
          status: 'shipped',
          trackingNumber: '1Z999AA1234567890',
          carrierCode: 'UPS',
          createdAt: '2024-01-15T10:30:00Z',
          customerEmail: 'john.smith@email.com',
          totalAmount: 89.99,
          currency: 'USD'
        },
        {
          id: '2',
          orderNumber: '#1002',
          customerName: 'Sarah Johnson',
          status: 'delivered',
          trackingNumber: '1Z999BB9876543210',
          carrierCode: 'UPS',
          createdAt: '2024-01-14T14:20:00Z',
          customerEmail: 'sarah.johnson@email.com',
          totalAmount: 156.50,
          currency: 'USD'
        },
        {
          id: '3',
          orderNumber: '#1003',
          customerName: 'Mike Wilson',
          status: 'processing',
          createdAt: '2024-01-16T08:45:00Z',
          customerEmail: 'mike.wilson@email.com',
          totalAmount: 45.00,
          currency: 'USD'
        }
      ]);
      
    } catch (err) {
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    console.log('Saving settings:', settings);
    setError(null);
  };

  const handleTestDelayDetection = () => {
    // In a real app, this would test the delay detection system
    console.log('Testing delay detection...');
    setError(null);
  };

  const handleConnectShopify = () => {
    // In a real app, this would initiate Shopify OAuth
    console.log('Connecting to Shopify...');
    setError(null);
  };

  const handleAlertAction = (alertId: string, action: 'resolve' | 'dismiss') => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { 
              ...alert, 
              status: action === 'resolve' ? 'resolved' : 'dismissed',
              resolvedAt: action === 'resolve' ? new Date().toISOString() : undefined
            }
          : alert
      )
    );
  };

  const handleOrderAction = (orderId: string, action: 'track' | 'view') => {
    console.log(`Order action: ${action} for order ${orderId}`);
    // In a real app, this would handle order actions
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
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
          onTabChange={setSelectedTab}
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
