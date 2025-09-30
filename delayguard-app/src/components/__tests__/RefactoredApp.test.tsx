import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../../tests/setup/test-utils';
import { RefactoredAppOptimized } from '../RefactoredApp.optimized';
import { createMockAlert, createMockOrder, createMockSettings, createMockStats } from '../../../tests/setup/test-utils';

// Mock all the hooks
jest.mock('../../hooks', () => ({
  useDelayAlerts: () => ({
    alerts: [createMockAlert()],
    loading: false,
    error: null,
  }),
  useOrders: () => ({
    orders: [createMockOrder()],
    loading: false,
    error: null,
  }),
  useSettings: () => ({
    settings: createMockSettings(),
    loading: false,
    error: null,
  }),
  useTabs: () => ({
    selectedTab: 0,
    changeTab: jest.fn(),
  }),
  useAlertActions: () => ({
    resolveAlert: jest.fn(),
    dismissAlert: jest.fn(),
  }),
  useOrderActions: () => ({
    trackOrder: jest.fn(),
    viewOrderDetails: jest.fn(),
  }),
  useSettingsActions: () => ({
    saveSettings: jest.fn(),
    testDelayDetection: jest.fn(),
    connectToShopify: jest.fn(),
  }),
}));

// Mock the lazy components
jest.mock('../tabs/LazyTabs', () => ({
  DashboardTabWithSuspense: ({ onSaveSettings, onTestDelayDetection, onConnectShopify, onSettingsChange }: any) => (
    <div data-testid="dashboard-tab">
      <button onClick={onSaveSettings}>Save Settings</button>
      <button onClick={onTestDelayDetection}>Test Detection</button>
      <button onClick={onConnectShopify}>Connect Shopify</button>
      <button onClick={() => onSettingsChange({ delayThreshold: 5 })}>Change Settings</button>
    </div>
  ),
  AlertsTabWithSuspense: ({ alerts, onAlertAction }: any) => (
    <div data-testid="alerts-tab">
      <div>Alerts: {alerts.length}</div>
      <button onClick={() => onAlertAction('alert-1', 'resolve')}>Resolve Alert</button>
    </div>
  ),
  OrdersTabWithSuspense: ({ orders, onOrderAction }: any) => (
    <div data-testid="orders-tab">
      <div>Orders: {orders.length}</div>
      <button onClick={() => onOrderAction('order-1', 'track')}>Track Order</button>
    </div>
  ),
}));

// Mock other components
jest.mock('../layout/AppHeader', () => ({
  AppHeader: ({ stats, loading }: any) => (
    <div data-testid="app-header">
      <div>Stats: {stats.totalAlerts}</div>
      <div>Loading: {loading.toString()}</div>
    </div>
  ),
}));

jest.mock('../layout/TabNavigation', () => ({
  TabNavigation: ({ selectedTab, onTabChange, loading }: any) => (
    <div data-testid="tab-navigation">
      <button onClick={() => onTabChange(0)} className={selectedTab === 0 ? 'active' : ''}>
        Dashboard
      </button>
      <button onClick={() => onTabChange(1)} className={selectedTab === 1 ? 'active' : ''}>
        Alerts
      </button>
      <button onClick={() => onTabChange(2)} className={selectedTab === 2 ? 'active' : ''}>
        Orders
      </button>
      <div>Loading: {loading.toString()}</div>
    </div>
  ),
}));

jest.mock('../common/ErrorAlert', () => ({
  ErrorAlert: ({ error, onDismiss }: any) => 
    error ? (
      <div data-testid="error-alert">
        <div>Error: {error}</div>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    ) : null,
}));

jest.mock('../ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ message, overlay }: any) => (
    <div data-testid="loading-spinner" data-overlay={overlay}>
      {message}
    </div>
  ),
}));

describe('RefactoredAppOptimized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<RefactoredAppOptimized />);
    
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    // Mock loading state
    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [], loading: true, error: null }),
      useOrders: () => ({ orders: [], loading: true, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: true, error: null }),
      useTabs: () => ({ selectedTab: 0, changeTab: jest.fn() }),
      useAlertActions: () => ({ resolveAlert: jest.fn(), dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: jest.fn(), viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ saveSettings: jest.fn(), testDelayDetection: jest.fn(), connectToShopify: jest.fn() }),
    }));

    render(<RefactoredAppOptimized />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toHaveAttribute('data-overlay', 'true');
  });

  it('renders dashboard tab by default', () => {
    render(<RefactoredAppOptimized />);
    
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
  });

  it('handles tab navigation', () => {
    const mockChangeTab = jest.fn();
    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [], loading: false, error: null }),
      useOrders: () => ({ orders: [], loading: false, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: false, error: null }),
      useTabs: () => ({ selectedTab: 1, changeTab: mockChangeTab }),
      useAlertActions: () => ({ resolveAlert: jest.fn(), dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: jest.fn(), viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ saveSettings: jest.fn(), testDelayDetection: jest.fn(), connectToShopify: jest.fn() }),
    }));

    render(<RefactoredAppOptimized />);
    
    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });

  it('handles error states', () => {
    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [], loading: false, error: 'Failed to load alerts' }),
      useOrders: () => ({ orders: [], loading: false, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: false, error: null }),
      useTabs: () => ({ selectedTab: 0, changeTab: jest.fn() }),
      useAlertActions: () => ({ resolveAlert: jest.fn(), dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: jest.fn(), viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ saveSettings: jest.fn(), testDelayDetection: jest.fn(), connectToShopify: jest.fn() }),
    }));

    render(<RefactoredAppOptimized />);
    
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
    expect(screen.getByText('Error: Failed to load alerts')).toBeInTheDocument();
  });

  it('handles action callbacks', async () => {
    const mockSaveSettings = jest.fn();
    const mockTestDelayDetection = jest.fn();
    const mockConnectShopify = jest.fn();
    const mockResolveAlert = jest.fn();
    const mockTrackOrder = jest.fn();

    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [createMockAlert()], loading: false, error: null }),
      useOrders: () => ({ orders: [createMockOrder()], loading: false, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: false, error: null }),
      useTabs: () => ({ selectedTab: 0, changeTab: jest.fn() }),
      useAlertActions: () => ({ resolveAlert: mockResolveAlert, dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: mockTrackOrder, viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ 
        saveSettings: mockSaveSettings, 
        testDelayDetection: mockTestDelayDetection, 
        connectToShopify: mockConnectShopify 
      }),
    }));

    render(<RefactoredAppOptimized />);
    
    // Test settings actions
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);
    await waitFor(() => expect(mockSaveSettings).toHaveBeenCalled());

    const testButton = screen.getByText('Test Detection');
    fireEvent.click(testButton);
    await waitFor(() => expect(mockTestDelayDetection).toHaveBeenCalled());

    const connectButton = screen.getByText('Connect Shopify');
    fireEvent.click(connectButton);
    await waitFor(() => expect(mockConnectShopify).toHaveBeenCalled());
  });

  it('handles different tab content', () => {
    const { rerender } = render(<RefactoredAppOptimized />);
    
    // Dashboard tab
    expect(screen.getByTestId('dashboard-tab')).toBeInTheDocument();
    
    // Mock alerts tab
    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [createMockAlert()], loading: false, error: null }),
      useOrders: () => ({ orders: [], loading: false, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: false, error: null }),
      useTabs: () => ({ selectedTab: 1, changeTab: jest.fn() }),
      useAlertActions: () => ({ resolveAlert: jest.fn(), dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: jest.fn(), viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ saveSettings: jest.fn(), testDelayDetection: jest.fn(), connectToShopify: jest.fn() }),
    }));

    rerender(<RefactoredAppOptimized />);
    expect(screen.getByTestId('alerts-tab')).toBeInTheDocument();
  });

  it('displays correct stats in header', () => {
    render(<RefactoredAppOptimized />);
    
    expect(screen.getByText('Stats: 12')).toBeInTheDocument();
  });

  it('handles settings changes', async () => {
    const mockSaveSettings = jest.fn();
    
    jest.doMock('../../hooks', () => ({
      useDelayAlerts: () => ({ alerts: [], loading: false, error: null }),
      useOrders: () => ({ orders: [], loading: false, error: null }),
      useSettings: () => ({ settings: createMockSettings(), loading: false, error: null }),
      useTabs: () => ({ selectedTab: 0, changeTab: jest.fn() }),
      useAlertActions: () => ({ resolveAlert: jest.fn(), dismissAlert: jest.fn() }),
      useOrderActions: () => ({ trackOrder: jest.fn(), viewOrderDetails: jest.fn() }),
      useSettingsActions: () => ({ 
        saveSettings: mockSaveSettings, 
        testDelayDetection: jest.fn(), 
        connectToShopify: jest.fn() 
      }),
    }));

    render(<RefactoredAppOptimized />);
    
    const changeButton = screen.getByText('Change Settings');
    fireEvent.click(changeButton);
    
    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith({ delayThreshold: 5 });
    });
  });
});
