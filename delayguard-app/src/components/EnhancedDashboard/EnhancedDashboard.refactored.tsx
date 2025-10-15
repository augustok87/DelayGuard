// Refactored EnhancedDashboard component with improved structure and organization
import * as React from 'react';
import { Button, Tabs } from '../ui';
import { useDashboardData } from './hooks/useDashboardData';
import { 
  StatsCards, 
  AlertsTable, 
  OrdersList, 
  SettingsModal, 
  Toast, 
} from './components';
import AnalyticsDashboard from '../AnalyticsDashboard';
import { EnhancedDashboardProps } from '../../types';
import { TAB_IDS } from './constants';

function EnhancedDashboard({
  settings: propSettings,
  alerts: propAlerts,
  stats: propStats,
  onSave: propOnSave,
  onTest: propOnTest,
  onConnect: propOnConnect,
  onAlertAction: propOnAlertAction,
  onSettingsChange: propOnSettingsChange,
}: EnhancedDashboardProps = {}) {
  const {
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
    
    // Handlers
    handleSaveSettings,
    handleResolveAlert,
    handleDismissAlert,
    handleTest,
    handleConnect,
    handleSettingsChange,
    handleTabChange,
    
    // Setters
    setShowSettings,
    setShowToast,
  } = useDashboardData({
    settings: propSettings,
    alerts: propAlerts,
    stats: propStats,
    onSave: propOnSave,
    onTest: propOnTest,
    onConnect: propOnConnect,
    onAlertAction: propOnAlertAction,
    onSettingsChange: propOnSettingsChange,
  });

  // Render loading state
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
        <div>Error: {error}</div>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // Render tabs content
  const renderTabsContent = () => {
    switch (selectedTab) {
      case 0: // Alerts
        return (
          <AlertsTable
            alerts={alerts}
            onResolve={handleResolveAlert}
            onDismiss={handleDismissAlert}
          />
        );
      case 1: // Orders
        return <OrdersList orders={orders} />;
      case 2: // Analytics
        return (
          <div>
            <AnalyticsDashboard />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
          DelayGuard Dashboard
        </h1>
        <Button
          onClick={() => setShowSettings(true)}
          variant="primary"
        >
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'alerts', label: 'Alerts', content: renderTabsContent() },
          { id: 'orders', label: 'Orders', content: renderTabsContent() },
          { id: 'analytics', label: 'Analytics', content: renderTabsContent() },
        ]}
        activeTab={TAB_IDS[selectedTab]}
        onTabChange={handleTabChange}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onTest={handleTest}
        onConnect={handleConnect}
        onSettingsChange={handleSettingsChange}
      />

      {/* Toast */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

export default EnhancedDashboard;
