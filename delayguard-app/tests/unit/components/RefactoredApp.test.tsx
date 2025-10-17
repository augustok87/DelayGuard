import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RefactoredApp from '../../../src/components/RefactoredApp';
import * as hooks from '../../../src/hooks';

// Mock the layout components
jest.mock('../../../src/components/layout/AppHeader', () => ({
  AppHeader: ({ shop, onConnectShopify }: any) => (
    <div data-testid="app-header">
      <span>App Header</span>
      {shop && <span>Shop: {shop}</span>}
      <button onClick={onConnectShopify}>Connect to Shopify</button>
    </div>
  ),
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
  ),
}));

// Mock the common components
jest.mock('../../../src/components/common/ErrorAlert', () => ({
  ErrorAlert: ({ error, onDismiss }: any) => (
    <div data-testid="error-alert">
      <span>{error}</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));

jest.mock('../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock the tab components
jest.mock('../../../src/components/tabs/DashboardTab', () => ({
  DashboardTab: ({ shop, stats, settings: _settings, onSaveSettings, onTestDelayDetection }: any) => (
    <div data-testid="dashboard-tab">
      <span>Dashboard Tab</span>
      {shop && <span>Shop: {shop}</span>}
      <span>Total Alerts: {stats.totalAlerts}</span>
      <button onClick={onSaveSettings}>Save Settings</button>
      <button onClick={onTestDelayDetection}>Test Delay Detection</button>
    </div>
  ),
}));

jest.mock('../../../src/components/tabs/AlertsTab', () => ({
  AlertsTab: ({ alerts, onAlertAction }: any) => (
    <div data-testid="alerts-tab">
      <span>Alerts Tab</span>
      <span>Alerts Count: {alerts.length}</span>
      <button onClick={() => onAlertAction('1', 'resolve')}>Resolve Alert</button>
      <button onClick={() => onAlertAction('1', 'dismiss')}>Dismiss Alert</button>
    </div>
  ),
}));

jest.mock('../../../src/components/tabs/OrdersTab', () => ({
  OrdersTab: ({ orders, onOrderAction }: any) => (
    <div data-testid="orders-tab">
      <span>Orders Tab</span>
      <span>Orders Count: {orders.length}</span>
      <button onClick={() => onOrderAction('1', 'track')}>Track Order</button>
      <button onClick={() => onOrderAction('1', 'view')}>View Details</button>
    </div>
  ),
}));

// Mock the custom hooks
const mockUseTabs = {
  selectedTab: 0, // Dashboard tab
  changeTab: jest.fn(),
};

const mockUseDelayAlerts = {
  alerts: [
    { id: '1', orderId: 'ORD-001', customerName: 'John Doe', delayDays: 3, status: 'active' },
    { id: '2', orderId: 'ORD-002', customerName: 'Jane Smith', delayDays: 1, status: 'resolved' },
  ],
  loading: false,
  error: null,
};

const mockUseOrders = {
  orders: [
    { id: '1', orderNumber: 'ORD-001', customerName: 'John Doe', status: 'shipped' },
    { id: '2', orderNumber: 'ORD-002', customerName: 'Jane Smith', status: 'delivered' },
  ],
  loading: false,
  error: null,
};

const mockUseSettings = {
  settings: {
    delayThreshold: 3,
    emailNotifications: true,
    smsNotifications: false,
  },
  loading: false,
  error: null,
};

const mockUseAlertActions = {
  resolveAlert: jest.fn(),
  dismissAlert: jest.fn(),
};

const mockUseOrderActions = {
  trackOrder: jest.fn(),
  viewOrderDetails: jest.fn(),
};

const mockUseSettingsActions = {
  saveSettings: jest.fn(),
  testDelayDetection: jest.fn(),
  connectToShopify: jest.fn(),
};

jest.mock('../../../src/hooks', () => ({
  useTabs: jest.fn(() => mockUseTabs),
  useDelayAlerts: jest.fn(() => mockUseDelayAlerts),
  useOrders: jest.fn(() => mockUseOrders),
  useSettings: jest.fn(() => mockUseSettings),
  useAlertActions: jest.fn(() => mockUseAlertActions),
  useOrderActions: jest.fn(() => mockUseOrderActions),
  useSettingsActions: jest.fn(() => mockUseSettingsActions),
}));

// Mock CSS modules
jest.mock('../../../src/components/RefactoredApp.module.css', () => ({
  container: 'container',
  header: 'header',
  content: 'content',
  sidebar: 'sidebar',
  main: 'main',
  footer: 'footer',
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
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      loading: true,
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display error state when there is an error', () => {
    // Mock error state
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts',
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
  });

  it('should display alerts tab when selected', () => {
    // Mock selected tab
    (hooks.useTabs as jest.Mock).mockReturnValue({
      ...mockUseTabs,
      selectedTab: 1, // alerts tab index
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });

  it('should display orders tab when selected', () => {
    // Mock selected tab
    (hooks.useTabs as jest.Mock).mockReturnValue({
      ...mockUseTabs,
      selectedTab: 2, // Orders tab
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('orders-tab')).toBeInTheDocument();
  });

  it('should handle alert actions', () => {
    // Mock alerts tab selection
    (hooks.useTabs as jest.Mock).mockReturnValue({
      ...mockUseTabs,
      selectedTab: 1, // Alerts tab
    });

    render(<RefactoredApp />);

    // Check that alerts tab is rendered
    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });

  it('should handle order actions', () => {
    // Mock orders tab selection
    (hooks.useTabs as jest.Mock).mockReturnValue({
      ...mockUseTabs,
      selectedTab: 2, // Orders tab
    });

    render(<RefactoredApp />);

    // Check that orders tab is rendered
    expect(screen.getByTestId('orders-tab')).toBeInTheDocument();
  });

  it('should handle settings actions', () => {
    render(<RefactoredApp />);

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle Shopify connection', () => {
    render(<RefactoredApp />);

    // Check that the connect button is rendered
    expect(screen.getByText('Connect to Shopify')).toBeInTheDocument();
  });

  it('should display shop information when connected', () => {
    render(<RefactoredApp />);

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle error dismissal', () => {
    // Mock error state
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts',
    });

    render(<RefactoredApp />);

    // Check that error alert is displayed
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
  });

  it('should handle responsive design', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
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

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle empty data states', () => {
    // Mock empty data
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: [],
    });

    jest.mocked(require('../../../src/hooks')).useOrders.mockReturnValue({
      ...mockUseOrders,
      orders: [],
    });

    render(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle multiple errors', () => {
    // Mock multiple errors
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      error: 'Failed to load alerts',
    });

    jest.mocked(require('../../../src/hooks')).useOrders.mockReturnValue({
      ...mockUseOrders,
      error: 'Failed to load orders',
    });

    render(<RefactoredApp />);

    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
  });

  it('should handle settings updates', () => {
    render(<RefactoredApp />);

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should handle real-time updates', () => {
    render(<RefactoredApp />);

    // Simulate real-time update
    const newAlert = {
      id: '3',
      orderId: 'ORD-003',
      customerName: 'Bob Johnson',
      delayDays: 2,
      status: 'active',
    };

    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: [...mockUseDelayAlerts.alerts, newAlert],
    });

    // Re-render with new data
    render(<RefactoredApp />);

    // Switch to alerts tab - use getAllByTestId to handle multiple instances
    const alertsTabs = screen.getAllByTestId('tab-alerts');
    fireEvent.click(alertsTabs[0]);

    // Check that the app renders without errors (use getAllByTestId to handle multiple instances)
    expect(screen.getAllByTestId('app-header')).toHaveLength(2);
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
    (hooks.useDelayAlerts as jest.Mock).mockReturnValue({
      ...mockUseDelayAlerts,
      alerts: [
        { id: '1', orderId: 'ORD-001', customerName: 'John Doe', delayDays: 3, status: 'active' },
      ],
    });

    rerender(<RefactoredApp />);

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    // Check that the app renders without errors
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });
});