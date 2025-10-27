import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AppProvider } from '../../src/components/AppProvider';
import { RootState } from '../../src/types/store';

// Mock store for testing
const createMockStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: {
      app: (state = { shop: null, loading: false, error: null, initialized: false }) => state,
      alerts: (state = { items: [], loading: false, error: null, filters: {}, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }) => state,
      orders: (state = { items: [], loading: false, error: null, filters: {}, pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }) => state,
      settings: (state = { data: { delayThreshold: 3, notificationTemplate: 'Your order is delayed', emailNotifications: true, smsNotifications: false }, loading: false, error: null, lastSaved: null }) => state,
      ui: (state = { selectedTab: 0, modals: {}, toasts: { items: [] }, theme: { mode: 'light', primaryColor: '#2563eb', secondaryColor: '#1d4ed8' }, sidebar: { isOpen: false } }) => state,
    },
    preloadedState,
  });
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof createMockStore>;
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderResult => {
  const { preloadedState, store = createMockStore(preloadedState), ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <AppProvider>
        {children}
      </AppProvider>
    </Provider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Mock data factories
export const createMockAlert = (overrides = {}) => ({
  id: 'alert-1',
  orderId: 'order-123',
  customerName: 'John Doe',
  delayDays: 5,
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  customerEmail: 'john@example.com',
  trackingNumber: 'TRK123456',
  carrierCode: 'UPS',
  priority: 'medium' as const,
  ...overrides,
});

export const createMockOrder = (overrides = {}) => ({
  id: 'order-1',
  orderNumber: 'ORD-123',
  customerName: 'Jane Smith',
  status: 'processing',
  trackingNumber: 'TRK789012',
  carrierCode: 'FEDEX',
  createdAt: '2024-01-01T00:00:00Z',
  customerEmail: 'jane@example.com',
  totalAmount: 99.99,
  currency: 'USD',
  ...overrides,
});

export const createMockSettings = (overrides = {}) => ({
  delayThreshold: 3,
  notificationTemplate: 'Your order is delayed',
  emailNotifications: true,
  smsNotifications: false,
  autoResolveDays: 7,
  enableAnalytics: true,
  theme: 'light' as const,
  language: 'en',
  ...overrides,
});

export const createMockStats = (overrides = {}) => ({
  totalAlerts: 12,
  activeAlerts: 3,
  resolvedAlerts: 9,
  avgResolutionTime: '2.3 days',
  customerSatisfaction: '',
  supportTicketReduction: '',
  totalOrders: 150,
  delayedOrders: 8,
  revenueImpact: 1250.50,
  ...overrides,
});

// Mock hook implementations
export const mockUseDelayAlerts = (overrides = {}) => ({
  alerts: [createMockAlert()],
  loading: false,
  error: null,
  fetchAlerts: jest.fn(),
  updateAlert: jest.fn(),
  deleteAlert: jest.fn(),
  createAlert: jest.fn(),
  ...overrides,
});

export const mockUseOrders = (overrides = {}) => ({
  orders: [createMockOrder()],
  loading: false,
  error: null,
  fetchOrders: jest.fn(),
  updateOrder: jest.fn(),
  deleteOrder: jest.fn(),
  createOrder: jest.fn(),
  ...overrides,
});

export const mockUseSettings = (overrides = {}) => ({
  settings: createMockSettings(),
  loading: false,
  error: null,
  updateSettings: jest.fn(),
  resetSettings: jest.fn(),
  ...overrides,
});

export const mockUseTabs = (overrides = {}) => ({
  selectedTab: 0,
  changeTab: jest.fn(),
  ...overrides,
});

// Performance testing utilities
export const mockPerformanceAPI = () => {
  const mockPerformance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  };

  Object.defineProperty(window, 'performance', {
    value: mockPerformance,
    writable: true,
  });

  return mockPerformance;
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};

// Test helpers
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

export const createMockEvent = (type: string, properties = {}) => ({
  type,
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...properties,
});

// Custom matchers
export const expectToBeInTheDocument = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
};

export const expectToHaveClass = (element: HTMLElement | null, className: string) => {
  expect(element).toHaveClass(className);
};

export const expectToHaveTextContent = (element: HTMLElement | null, text: string) => {
  expect(element).toHaveTextContent(text);
};
