import React, { useState, useEffect } from 'react';
import {
  Page,
  Card,
  DataTable,
  Button,
  Badge,
  TextField,
  Select,
  Tabs,
  Layout,
  Banner,
  Spinner,
  Text,
  BlockStack,
  InlineStack
} from '@shopify/polaris';
import styles from '../styles/DelayGuard.module.css';

// App Bridge integration will be added later
// import { useAppBridge } from '@shopify/app-bridge-react';
// import { Redirect } from '@shopify/app-bridge/actions';

interface AppSettings {
  delayThreshold: number;
  notificationTemplate: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface DelayAlert {
  id: string;
  orderId: string;
  customerName: string;
  delayDays: number;
  status: 'active' | 'resolved' | 'dismissed';
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

export function MinimalApp() {
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
  const [stats, setStats] = useState({
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
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          orderId: '1002',
          customerName: 'Sarah Johnson',
          delayDays: 5,
          status: 'resolved',
          createdAt: '2024-01-14T14:20:00Z',
          resolvedAt: '2024-01-16T09:15:00Z'
        },
        {
          id: '3',
          orderId: '1003',
          customerName: 'Mike Wilson',
          delayDays: 2,
          status: 'active',
          createdAt: '2024-01-16T08:45:00Z'
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
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          orderNumber: '#1002',
          customerName: 'Sarah Johnson',
          status: 'delivered',
          trackingNumber: '1Z999BB9876543210',
          carrierCode: 'UPS',
          createdAt: '2024-01-14T14:20:00Z'
        },
        {
          id: '3',
          orderNumber: '#1003',
          customerName: 'Mike Wilson',
          status: 'processing',
          createdAt: '2024-01-16T08:45:00Z'
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

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { class: string; text: string } } = {
      'active': { class: styles.badgeDanger, text: 'Active' },
      'resolved': { class: styles.badgeSuccess, text: 'Resolved' },
      'dismissed': { class: styles.badgeInfo, text: 'Dismissed' },
      'shipped': { class: styles.badgeInfo, text: 'Shipped' },
      'delivered': { class: styles.badgeSuccess, text: 'Delivered' },
      'processing': { class: styles.badgeWarning, text: 'Processing' }
    };
    
    const statusInfo = statusMap[status] || { class: styles.badgeInfo, text: status };
    return <span className={`${styles.badge} ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  if (loading) {
    return (
      <div className={styles.app}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.icon}>🛡️</div>
          <div>
            <h1 className={styles.title}>DelayGuard</h1>
            <p className={styles.subtitle}>Proactive Shipping Delay Notifications</p>
          </div>
        </div>
        
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.totalAlerts}</div>
            <div className={styles.statLabel}>Total Alerts</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.activeAlerts}</div>
            <div className={styles.statLabel}>Active</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.resolvedAlerts}</div>
            <div className={styles.statLabel}>Resolved</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.supportTicketReduction}</div>
            <div className={styles.statLabel}>Ticket Reduction</div>
          </div>
        </div>
      </div>

      <div>
        {error && (
          <div className={styles.alert} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.alertIcon}>⚠️</div>
            <div>
              <strong>Error:</strong> {error}
              <button onClick={() => setError(null)} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={styles.tabs}>
          <div 
            className={`${styles.tab} ${selectedTab === 0 ? styles.tabActive : ''}`}
            onClick={() => setSelectedTab(0)}
          >
            📊 Dashboard
          </div>
          <div 
            className={`${styles.tab} ${selectedTab === 1 ? styles.tabActive : ''}`}
            onClick={() => setSelectedTab(1)}
          >
            🚨 Delay Alerts
          </div>
          <div 
            className={`${styles.tab} ${selectedTab === 2 ? styles.tabActive : ''}`}
            onClick={() => setSelectedTab(2)}
          >
            📦 Orders
          </div>
        </div>

        {/* Dashboard Tab */}
        {selectedTab === 0 && (
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>App Settings</h2>
                <p className={styles.cardSubtitle}>Configure your delay detection preferences</p>
              </div>
              <div className={styles.cardContent}>
                {shop ? (
                  <div className={styles.alert} style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderColor: '#10b981' }}>
                    <div className={styles.alertIcon}>✅</div>
                    <div>
                      <strong>Connected to Shopify:</strong> {shop}
                    </div>
                  </div>
                ) : (
                  <div className={styles.alert}>
                    <div className={styles.alertIcon}>⚠️</div>
                    <div>
                      <strong>Not connected to Shopify.</strong> Click below to authenticate.
                    </div>
                  </div>
                )}
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Delay Threshold (days)
                  </label>
                  <input
                    type="number"
                    className={styles.input}
                    value={settings.delayThreshold}
                    onChange={(e) => setSettings({...settings, delayThreshold: parseInt(e.target.value) || 0})}
                    min="1"
                    max="30"
                  />
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
                    Minimum delay in days before sending notifications
                  </p>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Notification Template
                  </label>
                  <select
                    className={styles.select}
                    value={settings.notificationTemplate}
                    onChange={(e) => setSettings({...settings, notificationTemplate: e.target.value})}
                  >
                    <option value="default">Default Template</option>
                    <option value="custom">Custom Template</option>
                    <option value="minimal">Minimal Template</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className={styles.button} onClick={handleSaveSettings}>
                    Save Settings
                  </button>
                  <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleTestDelayDetection}>
                    Test Delay Detection
                  </button>
                  {!shop && (
                    <button className={`${styles.button} ${styles.buttonSecondary}`} onClick={handleConnectShopify}>
                      Connect to Shopify
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Performance Metrics</h2>
                <p className={styles.cardSubtitle}>Real-time insights into your delay management</p>
              </div>
              <div className={styles.cardContent}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981', marginBottom: '0.5rem' }}>
                      {stats.customerSatisfaction}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Customer Satisfaction</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2563eb', marginBottom: '0.5rem' }}>
                      {stats.avgResolutionTime}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Avg Resolution Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delay Alerts Tab */}
        {selectedTab === 1 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Delay Alerts</h2>
              <p className={styles.cardSubtitle}>Monitor and manage shipping delay notifications</p>
            </div>
            <div className={styles.cardContent}>
              {alerts.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📊</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No delay alerts found</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>Alerts will appear here when delays are detected.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Delay Days</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.id}>
                        <td>{alert.orderId}</td>
                        <td>{alert.customerName}</td>
                        <td>{alert.delayDays} days</td>
                        <td>{getStatusBadge(alert.status)}</td>
                        <td>{new Date(alert.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {selectedTab === 2 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Orders</h2>
              <p className={styles.cardSubtitle}>Track and monitor your order fulfillment</p>
            </div>
            <div className={styles.cardContent}>
              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📦</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No orders found</h3>
                  <p style={{ margin: 0, color: '#6b7280' }}>Orders will appear here when they are processed.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Tracking</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td>{order.trackingNumber || 'N/A'}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}