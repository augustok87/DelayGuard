import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock store for testing
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      app: (state = { loading: false, error: null }, _action) => state,
      alerts: (state = { items: [], loading: false }, _action) => state,
      orders: (state = { items: [], loading: false }, _action) => state,
      settings: (state = { data: {}, loading: false }, _action) => state,
      ui: (state = { theme: 'light', sidebarOpen: false }, _action) => state,
    },
    preloadedState,
  });
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: any;
}

const customRender = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    ...renderOptions
  }: CustomRenderOptions = {},
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      {children}
    </Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
};

// Accessibility testing helper (simplified)
export const testAccessibility = async(container: HTMLElement) => {
  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  const inputs = container.querySelectorAll('input');
  
  // Check for proper button labels
  buttons.forEach(button => {
    const hasLabel = button.getAttribute('aria-label') || 
                    button.textContent?.trim() || 
                    button.querySelector('img[alt]');
    expect(hasLabel).toBeTruthy();
  });
  
  // Check for proper input labels
  inputs.forEach((input, index) => {
    const hasLabel = input.getAttribute('aria-label') || 
                    input.getAttribute('aria-labelledby') ||
                    input.closest('label') ||
                    (input.getAttribute('id') && document.querySelector(`label[for="${input.getAttribute('id')}"]`));
    
    // Skip hidden inputs or inputs that are not visible
    if (input.type === 'hidden' || input.style.display === 'none' || input.hidden) {
      return;
    }
    
    // Debug: log input details if no label found
    if (!hasLabel) {
      console.log(`Input ${index} has no label:`, {
        type: input.type,
        id: input.getAttribute('id'),
        name: input.getAttribute('name'),
        placeholder: input.getAttribute('placeholder'),
        hasClosestLabel: !!input.closest('label'),
        hasId: !!input.getAttribute('id'),
        hasAriaLabel: !!input.getAttribute('aria-label'),
        hasAriaLabelledBy: !!input.getAttribute('aria-labelledby'),
      });
    }
    
    expect(hasLabel).toBeTruthy();
  });
  
  return { violations: [] };
};

// Performance testing helper
export const testPerformance = (renderFn: () => void, maxTime = 16) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  const renderTime = end - start;
  
  expect(renderTime).toBeLessThan(maxTime);
  return renderTime;
};

// Mock data generators
export const mockAppSettings = () => ({
  delayThresholdDays: 3,
  emailEnabled: true,
  smsEnabled: false,
  notificationTemplate: 'Your order is delayed',
  autoResolveDays: 7,
  enableAnalytics: true,
});

export const mockDelayAlert = (overrides = {}) => ({
  id: 'alert-1',
  orderId: 'order-123',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  delayDays: 5,
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const mockOrder = (overrides = {}) => ({
  id: 'order-123',
  orderNumber: 'ORD-001',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  status: 'shipped',
  trackingNumber: 'TRK-123',
  estimatedDelivery: '2025-01-05',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

export const mockStatsData = () => ({
  totalAlerts: 12,
  activeAlerts: 3,
  resolvedAlerts: 9,
  avgResolutionTime: '2.3 days',
  customerSatisfaction: '',
  supportTicketReduction: '',
});

// Component testing helpers
export const createMockProps = (component: string, overrides = {}) => {
  const baseProps: Record<string, any> = {
    Button: {
      children: 'Test Button',
      onClick: jest.fn(),
    },
    Card: {
      title: 'Test Card',
      children: 'Test Content',
    },
    Modal: {
      isOpen: true,
      onClose: jest.fn(),
      title: 'Test Modal',
      children: 'Test Content',
    },
    Tabs: {
      tabs: [
        { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
        { id: 'tab2', label: 'Tab 2', content: 'Content 2' },
      ],
    },
    DataTable: {
      columns: [
        { key: 'id', title: 'ID' },
        { key: 'name', title: 'Name' },
      ],
      data: [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ],
    },
  };

  return { ...baseProps[component], ...overrides };
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
export { createTestStore };
