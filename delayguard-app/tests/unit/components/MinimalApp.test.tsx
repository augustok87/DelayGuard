import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MinimalApp } from '../../../src/components/MinimalApp';

// Mock Web Components
jest.mock('../../../src/components', () => ({
  Button: ({ children, onClick, ...props }: any) => <button data-testid="button" onClick={onClick} {...props}>{children}</button>,
  Card: ({ children, title, ...props }: any) => <div data-testid="card" data-title={title} {...props}>{children}</div>,
  DataTable: ({ columns, data, headings, rows, ...props }: any) => {
    // Support both old API (headings/rows) and new API (columns/data)
    const tableColumns = columns || headings?.map((heading: any, index: number) => ({
      key: `col_${index}`,
      title: heading,
      sortable: false
    }));
    const tableData = data || rows?.map((row: any, index: number) => ({
      id: `row_${index}`,
      ...(Array.isArray(row) ? 
        row.reduce((acc, cell, cellIndex) => ({ ...acc, [`col_${cellIndex}`]: cell }), {}) :
        row
      )
    }));

    return (
      <table data-testid="data-table" {...props}>
        <thead>
          <tr>
            {tableColumns?.map((column: any, index: number) => (
              <th key={column.key || index}>{column.title || column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData?.map((row: any, index: number) => (
            <tr key={row.id || index}>
              {tableColumns?.map((column: any, colIndex: number) => (
                <td key={column.key || colIndex}>
                  {row[column.key] || (Array.isArray(row) ? row[colIndex] : row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  Badge: ({ children, status, ...props }: any) => <span data-testid="badge" data-status={status} {...props}>{children}</span>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  Tabs: ({ tabs, selected, onSelect, ...props }: any) => (
    <div data-testid="tabs" {...props}>
      {tabs?.map((tab: any, index: number) => (
        <button 
          key={index} 
          data-testid={`tab-${tab.id}`}
          onClick={() => onSelect(index)}
          className={selected === index ? 'active' : ''}
        >
          {tab.content}
        </button>
      ))}
    </div>
  ),
  Modal: ({ children, open, onClose, ...props }: any) => 
    open ? <div data-testid="modal" {...props}>{children}</div> : null,
  ResourceList: ({ children, ...props }: any) => <div data-testid="resource-list" {...props}>{children}</div>,
  ResourceItem: ({ children, ...props }: any) => <div data-testid="resource-item" {...props}>{children}</div>,
  Toast: ({ children, ...props }: any) => <div data-testid="toast" {...props}>{children}</div>,
  Spinner: ({ ...props }: any) => <div data-testid="spinner" {...props}>Loading...</div>,
  EmptyState: ({ children, ...props }: any) => <div data-testid="empty-state" {...props}>{children}</div>,
  Divider: ({ ...props }: any) => <hr data-testid="divider" {...props} />,
  Icon: ({ source, ...props }: any) => <span data-testid="icon" data-source={source} {...props}>📦</span>,
  Section: ({ children, ...props }: any) => <div data-testid="section" {...props}>{children}</div>,
}));

// Mock CSS modules
jest.mock('../../../src/styles/DelayGuard.module.css', () => ({
  container: 'container',
  header: 'header',
  content: 'content',
  sidebar: 'sidebar',
  main: 'main',
  footer: 'footer',
}));

// Mock the analytics API
const mockAnalyticsAPI = {
  getMetrics: jest.fn(),
  getAlerts: jest.fn(),
  getOrders: jest.fn(),
  updateSettings: jest.fn(),
  testDelayDetection: jest.fn(),
};

jest.mock('../../../src/services/analytics-service', () => ({
  AnalyticsService: jest.fn().mockImplementation(() => mockAnalyticsAPI),
}));

describe('MinimalApp', () => {
  // Mock setTimeout to make tests faster
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockSettings = {
    delayThreshold: 3,
    notificationTemplate: 'default',
    emailNotifications: true,
    smsNotifications: false,
  };

  const mockAlerts = [
    {
      id: '1',
      orderId: 'ORD-001',
      customerName: 'John Doe',
      delayDays: 3,
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      delayDays: 1,
      status: 'resolved',
      createdAt: '2024-01-15T11:00:00Z',
      resolvedAt: '2024-01-16T10:00:00Z',
    },
  ];

  const mockOrders = [
    {
      id: '1',
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      status: 'shipped',
      trackingNumber: '1Z999AA1234567890',
      carrierCode: 'UPS',
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      customerName: 'Jane Smith',
      status: 'delivered',
      trackingNumber: '1Z999BB1234567890',
      carrierCode: 'FEDEX',
      createdAt: '2024-01-12T14:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsAPI.getMetrics.mockResolvedValue({});
    mockAnalyticsAPI.getAlerts.mockResolvedValue(mockAlerts);
    mockAnalyticsAPI.getOrders.mockResolvedValue(mockOrders);
    mockAnalyticsAPI.updateSettings.mockResolvedValue({});
    mockAnalyticsAPI.testDelayDetection.mockResolvedValue({ success: true });
    
    // Set up window mock for test delay detection
    (window as any).mockAnalyticsAPI = mockAnalyticsAPI;
  });

  it('should render minimal app with all main components', async() => {
    render(<MinimalApp />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    // Wait for the main content to appear
    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Check if main components are rendered
    expect(screen.getByText('Proactive Shipping Delay Notifications')).toBeInTheDocument();
    expect(screen.getByText('Total Alerts:')).toBeInTheDocument();
    expect(screen.getByText('Active:')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    mockAnalyticsAPI.getAlerts.mockImplementation(() => new Promise(() => {}));
    
    render(<MinimalApp />);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should handle tab switching between alerts and orders', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
  });

  it('should display alerts in the alerts tab', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Check if alerts are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display orders in the orders tab', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });
  });

  it('should filter alerts by status', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Filter by active status
    const statusFilter = screen.getByTestId('select');
    fireEvent.change(statusFilter, { target: { value: 'active' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('should search alerts by customer name', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Search for specific customer
    const searchInput = screen.getByTestId('text-field');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('should handle alert actions', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Select an alert first
    const checkboxes = screen.getAllByTestId('checkbox');
    fireEvent.click(checkboxes[0]); // Select first alert

    // Wait for bulk actions to appear
    await waitFor(() => {
      expect(screen.getByText('Mark as Resolved')).toBeInTheDocument();
    });

    // Mark alert as resolved
    const resolveButton = screen.getByText('Mark as Resolved');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(screen.getByText('1 alerts updated')).toBeInTheDocument();
    });
  });

  it('should handle order actions', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Track order
    const trackButtons = screen.getAllByText('Track Order');
    fireEvent.click(trackButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Tracking information loaded')).toBeInTheDocument();
    });
  });

  it('should display empty state when no alerts', async() => {
    mockAnalyticsAPI.getAlerts.mockResolvedValue([]);
    
    render(<MinimalApp />);

    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument();
    });
  });

  it('should display empty state when no orders', async() => {
    mockAnalyticsAPI.getOrders.mockResolvedValue([]);
    
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('No orders found')).toBeInTheDocument();
    });
  });

  it('should handle error state when API fails', async() => {
    mockAnalyticsAPI.getAlerts.mockRejectedValue(new Error('API Error'));
    
    render(<MinimalApp />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.getAlerts).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle settings updates', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Debug: Check if modal is rendered
    console.log('Modal in DOM:', screen.queryByTestId('modal'));
    console.log('App Settings text:', screen.queryByText('App Settings'));

    await waitFor(() => {
      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    // Update delay threshold
    const delayThresholdInput = screen.getByDisplayValue('2');
    fireEvent.change(delayThresholdInput, { target: { value: '5' } });

    // Save settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          delayThreshold: 5,
        }),
      );
    });
  });

  it('should handle notification settings', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    // Toggle email notifications checkbox
    const emailCheckbox = screen.getByTestId('email-notifications-checkbox');
    fireEvent.click(emailCheckbox);

    // Wait for state to update
    await waitFor(() => {
      expect(emailCheckbox).not.toBeChecked();
    });

    // Save settings
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          emailNotifications: false,
        }),
      );
    });
  });

  it('should handle responsive design', async() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const firstButton = screen.getAllByTestId('button')[0];
    firstButton.focus();
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('should display alert statistics', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Check if statistics are displayed using test IDs
    expect(screen.getByTestId('total-alerts')).toHaveTextContent('2');
    expect(screen.getByTestId('active-alerts')).toHaveTextContent('1');
    expect(screen.getByTestId('resolved-alerts')).toHaveTextContent('1');
  });

  it('should handle bulk actions on alerts', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Select multiple alerts
    const checkboxes = screen.getAllByTestId('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Perform bulk action
    const bulkActionButton = screen.getByText('Mark as Resolved');
    fireEvent.click(bulkActionButton);

    await waitFor(() => {
      expect(screen.getByText('2 alerts updated')).toBeInTheDocument();
    });
  });

  it('should handle date range filtering', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    // Set date range
    const startDateInput = screen.getByTestId('start-date');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(mockAnalyticsAPI.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
        }),
      );
    });
  });

  it('should handle real-time updates', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Simulate real-time update
    const newAlert = {
      id: '3',
      orderId: 'ORD-003',
      customerName: 'Bob Johnson',
      delayDays: 2,
      status: 'active',
      createdAt: '2024-01-15T12:00:00Z',
    };

    mockAnalyticsAPI.getAlerts.mockResolvedValue([...mockAlerts, newAlert]);

    // Simulate WebSocket update
    const messageEvent = new MessageEvent('message', {
      data: { type: 'real-time-update' },
    });
    fireEvent(window, messageEvent);

    await waitFor(() => {
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('should handle export functionality', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Export alerts
    const exportButton = screen.getByText('Export Alerts');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export started')).toBeInTheDocument();
    });
  });

  it('should handle test delay detection', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Test delay detection button is in the alerts tab (which is active by default)
    const testButton = screen.getByText('Test Delay Detection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.testDelayDetection).toHaveBeenCalled();
    });
  });

  it('should handle pagination', async() => {
    // Mock large dataset
    const largeAlerts = Array.from({ length: 50 }, (_, i) => ({
      id: String(i + 1),
      orderId: `ORD-${String(i + 1).padStart(3, '0')}`,
      customerName: `Customer ${i + 1}`,
      delayDays: Math.floor(Math.random() * 5) + 1,
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
    }));

    mockAnalyticsAPI.getAlerts.mockResolvedValue(largeAlerts);

    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Check if pagination is displayed
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('should handle accessibility features', async() => {
    render(<MinimalApp />);

    // Advance timers to complete the setTimeout
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('DelayGuard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('App Settings')).toBeInTheDocument();
    });

    // Check if accessibility features are available
    expect(screen.getByText('High Contrast')).toBeInTheDocument();
    expect(screen.getByText('Large Text')).toBeInTheDocument();
  });
});
