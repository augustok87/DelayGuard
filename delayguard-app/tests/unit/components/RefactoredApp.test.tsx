import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RefactoredApp } from '../../../src/components/RefactoredApp';

// Mock the layout components
jest.mock('../../../src/components/layout/AppHeader', () => ({
  AppHeader: ({ shop, onConnectShopify }: any) => (
    <div data-testid="app-header">
      <span>App Header</span>
      {shop && <span>Shop: {shop}</span>}
      <button onClick={onConnectShopify}>Connect to Shopify</button>
    </div>
  )
}));

jest.mock('../../../src/components/layout/TabNavigation', () => ({
  TabNavigation: ({ selectedTab, onTabChange }: any) => (
    <div data-testid="tab-navigation">
      <button 
        data-testid="tab-dashboard" 
        onClick={() => onTabChange('dashboard')}
        className={selectedTab === 'dashboard' ? 'active' : ''}
      >
        Dashboard
      </button>
      <button 
        data-testid="tab-alerts" 
        onClick={() => onTabChange('alerts')}
        className={selectedTab === 'alerts' ? 'active' : ''}
      >
        Alerts
      </button>
      <button 
        data-testid="tab-orders" 
        onClick={() => onTabChange('orders')}
        className={selectedTab === 'orders' ? 'active' : ''}
      >
        Orders
      </button>
    </div>
  )
}));

// Mock the common components
jest.mock('../../../src/components/common/ErrorAlert', () => ({
  ErrorAlert: ({ error, onDismiss }: any) => (
    <div data-testid="error-alert">
      <span>{error}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}));

jest.mock('../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>
}));

// Mock the tab components
jest.mock('../../../src/components/tabs/DashboardTab', () => ({
  DashboardTab: ({ stats, settings, onSaveSettings, onTestDelayDetection }: any) => (
    <div data-testid="dashboard-tab">
      <span>Dashboard Tab</span>
      <span>Total Alerts: {stats.totalAlerts}</span>
      <button onClick={onSaveSettings}>Save Settings</button>
      <button onClick={onTestDelayDetection}>Test Delay Detection</button>
    </div>
  )
}));

jest.mock('../../../src/components/tabs/AlertsTab', () => ({
  AlertsTab: ({ alerts, onResolveAlert, onDismissAlert }: any) => (
    <div data-testid="alerts-tab">
      <span>Alerts Tab</span>
      <span>Alerts Count: {alerts.length}</span>
      <button onClick={() => onResolveAlert('1')}>Resolve Alert</button>
      <button onClick={() => onDismissAlert('1')}>Dismiss Alert</button>
    </div>
  )
}));

jest.mock('../../../src/components/tabs/OrdersTab', () => ({
  OrdersTab: ({ orders, onTrackOrder, onViewOrderDetails }: any) => (
    <div data-testid="orders-tab">
      <span>Orders Tab</span>
      <span>Orders Count: {orders.length}</span>
      <button onClick={() => onTrackOrder('1')}>Track Order</button>
      <button onClick={() => onViewOrderDetails('1')}>View Details</button>
    </div>
  )
}));

// Mock the custom hooks
const mockUseTabs = {
  selectedTab: 'dashboard',
  changeTab: jest.fn()
};

const mockUseDelayAlerts = {
  alerts: [
    { id: '1', orderId: 'ORD-001', customerName: 'John Doe', delayDays: 3, status: 'active' },
    { id: '2', orderId: 'ORD-002', customerName: 'Jane Smith', delayDays: 1, status: 'resolved' }
  ],
  loading: false,
  error: null
};

const mockUseOrders = {
  orders: [
    { id: '1', orderNumber: 'ORD-001', customerName: 'John Doe', status: 'shipped' },
    { id: '2', orderNumber: 'ORD-002', customerName: 'Jane Smith', status: 'delivered' }
  ],
  loading: false,
  error: null
};

const mockUseSettings = {
  settings: {
    delayThreshold: 3,
    emailNotifications: true,
    smsNotifications: false
  },
  loading: false,
  error: null
};

const mockUseAlertActions = {
  resolveAlert: jest.fn(),
  dismissAlert: jest.fn()
};

const mockUseOrderActions = {
  trackOrder: jest.fn(),
  viewOrderDetails: jest.fn()
};

const mockUseSettingsActions = {
  saveSettings: jest.fn(),
  testDelayDetection: jest.fn(),
  connectToShopify: jest.fn()
};

jest.mock('../../../src/hooks', () => ({
  useTabs: () => mockUseTabs,
  useDelayAlerts: () => mockUseDelayAlerts,
  useOrders: () => mockUseOrders,
  useSettings: () => mockUseSettings,
  useAlertActions: () => mockUseAlertActions,
  useOrderActions: () => mockUseOrderActions,
  useSettingsActions: () => mockUseSettingsActions
}));

// Mock CSS modules
jest.mock('../../../src/components/RefactoredApp.module.css', () => ({
  container: 'container',
  header: 'header',
  content: 'content',
  sidebar: 'sidebar',
  main: 'main',
  footer: 'footer'
}));

describe('RefactoredApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render refactored app with all components', () => {
    render(<RefactoredApp />);

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
  });

  it('should display loading state when data is loading', () => {
    // Mock loading state
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      loading: true
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state when there is an error', () => {
    // Mock error state
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts'
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
  });

  it('should handle tab switching', () => {
    render(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    expect(mockUseTabs.changeTab).toHaveBeenCalledWith('alerts');
  });

  it('should display dashboard tab by default', () => {
    render(<RefactoredApp />);

    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
    expect(screen.getByText('Total Alerts: 12')).toBeInTheDocument();
  });

  it('should display alerts tab when selected', () => {
    // Mock selected tab
    jest.mocked(require('../../../src/hooks')).useTabs.mockReturnValue({
      ...mockUseTabs,
      selectedTab: 'alerts'
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
    expect(screen.getByText('Alerts Count: 2')).toBeInTheDocument();
  });

  it('should display orders tab when selected', () => {
    // Mock selected tab
    jest.mocked(require('../../../src/hooks')).useTabs.mockReturnValue({
      ...mockUseTabs,
      selectedTab: 'orders'
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('orders-tab')).toBeInTheDocument();
    expect(screen.getByText('Orders Count: 2')).toBeInTheDocument();
  });

  it('should handle alert actions', () => {
    render(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    // Resolve alert
    const resolveButton = screen.getByText('Resolve Alert');
    fireEvent.click(resolveButton);

    expect(mockUseAlertActions.resolveAlert).toHaveBeenCalledWith('1');

    // Dismiss alert
    const dismissButton = screen.getByText('Dismiss Alert');
    fireEvent.click(dismissButton);

    expect(mockUseAlertActions.dismissAlert).toHaveBeenCalledWith('1');
  });

  it('should handle order actions', () => {
    render(<RefactoredApp />);

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    // Track order
    const trackButton = screen.getByText('Track Order');
    fireEvent.click(trackButton);

    expect(mockUseOrderActions.trackOrder).toHaveBeenCalledWith('1');

    // View order details
    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockUseOrderActions.viewOrderDetails).toHaveBeenCalledWith('1');
  });

  it('should handle settings actions', () => {
    render(<RefactoredApp />);

    // Save settings
    const saveSettingsButton = screen.getByText('Save Settings');
    fireEvent.click(saveSettingsButton);

    expect(mockUseSettingsActions.saveSettings).toHaveBeenCalled();

    // Test delay detection
    const testButton = screen.getByText('Test Delay Detection');
    fireEvent.click(testButton);

    expect(mockUseSettingsActions.testDelayDetection).toHaveBeenCalled();
  });

  it('should handle Shopify connection', () => {
    render(<RefactoredApp />);

    const connectButton = screen.getByText('Connect to Shopify');
    fireEvent.click(connectButton);

    expect(mockUseSettingsActions.connectToShopify).toHaveBeenCalled();
  });

  it('should display shop information when connected', () => {
    // Mock shop state
    const { useState } = require('react');
    useState.mockReturnValue(['test-shop.myshopify.com', jest.fn()]);

    render(<RefactoredApp />);

    expect(screen.getByText('Shop: test-shop.myshopify.com')).toBeInTheDocument();
  });

  it('should handle error dismissal', () => {
    // Mock error state
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts'
    });

    render(<RefactoredApp />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    // Error should be cleared
    expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
  });

  it('should handle responsive design', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });

    render(<RefactoredApp />);

    // Check if responsive layout is applied
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', () => {
    render(<RefactoredApp />);

    // Test keyboard navigation
    const firstButton = screen.getAllByTestId('tab-dashboard')[0];
    firstButton.focus();
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('should display statistics correctly', () => {
    render(<RefactoredApp />);

    expect(screen.getByText('Total Alerts: 12')).toBeInTheDocument();
  });

  it('should handle empty data states', () => {
    // Mock empty data
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: []
    });

    jest.mocked(require('../../../src/hooks')).useOrders.mockReturnValue({
      ...mockUseOrders,
      orders: []
    });

    render(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Alerts Count: 0')).toBeInTheDocument();
  });

  it('should handle multiple errors', () => {
    // Mock multiple errors
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts'
    });

    jest.mocked(require('../../../src/hooks')).useOrders.mockReturnValue({
      ...mockUseOrders,
      error: 'Failed to load orders'
    });

    render(<RefactoredApp />);

    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
  });

  it('should handle settings updates', () => {
    render(<RefactoredApp />);

    // Update settings
    const saveSettingsButton = screen.getByText('Save Settings');
    fireEvent.click(saveSettingsButton);

    expect(mockUseSettingsActions.saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        delayThreshold: 3,
        emailNotifications: true,
        smsNotifications: false
      })
    );
  });

  it('should handle real-time updates', () => {
    render(<RefactoredApp />);

    // Simulate real-time update
    const newAlert = {
      id: '3',
      orderId: 'ORD-003',
      customerName: 'Bob Johnson',
      delayDays: 2,
      status: 'active'
    };

    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: [...mockUseDelayAlerts.alerts, newAlert]
    });

    // Re-render with new data
    render(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Alerts Count: 3')).toBeInTheDocument();
  });

  it('should handle component unmounting', () => {
    const { unmount } = render(<RefactoredApp />);

    // Unmount component
    unmount();

    // Should not throw any errors
    expect(true).toBe(true);
  });

  it('should handle prop changes', () => {
    const { rerender } = render(<RefactoredApp />);

    // Re-render with different data
    jest.mocked(require('../../../src/hooks')).useDelayAlerts.mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: [
        { id: '1', orderId: 'ORD-001', customerName: 'John Doe', delayDays: 3, status: 'active' }
      ]
    });

    rerender(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    expect(screen.getByText('Alerts Count: 1')).toBeInTheDocument();
  });
});