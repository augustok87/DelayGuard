/* eslint-disable react/no-array-index-key */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedDashboard from '../../../src/components/EnhancedDashboard';

// Mock UI Components
jest.mock('../../../src/components/ui', () => ({
  Button: ({ children, onClick, ...props }: any) => <button data-testid="button" onClick={onClick} {...props}>{children}</button>,
  Card: ({ children, title, ...props }: any) => <div data-testid="card" data-title={title} {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  Modal: ({ children, title, isOpen, open, onClose: _onClose, primaryAction, secondaryAction, ...props }: any) => {
    const modalOpen = isOpen !== undefined ? isOpen : open;
    return modalOpen ? (
      <div data-testid="modal" {...props}>
        <h2>{title}</h2>
        <div>{children}</div>
        <div>
          {secondaryAction && <button onClick={secondaryAction.onAction}>{secondaryAction.content}</button>}
          {primaryAction && <button onClick={primaryAction.onAction}>{primaryAction.content}</button>}
        </div>
      </div>
    ) : null;
  },
  Tabs: ({ tabs, activeTab, onTabChange, ...props }: any) => {
    const [currentTab, setCurrentTab] = React.useState(activeTab || tabs?.[0]?.id || '');
    const handleTabClick = (tabId: string) => {
      setCurrentTab(tabId);
      if (onTabChange) {
        onTabChange(tabId);
      }
    };
    return (
      <div data-testid="tabs" {...props}>
        {tabs?.map((tab: any) => (
          <button 
            key={tab.id} 
            data-testid={`tab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
            aria-selected={currentTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
        {tabs?.map((tab: any) => (
          <div key={`panel-${tab.id}`} hidden={currentTab !== tab.id}>
            {currentTab === tab.id && tab.content}
          </div>
        ))}
      </div>
    );
  },
  DataTable: ({ columns, data, rows, onRowClick, ...props }: any) => {
    const tableData = data || rows || [];
    return (
      <table data-testid="data-table" {...props}>
        <thead>
          <tr>
            {columns?.map((column: any, index: number) => (
              <th key={index}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData?.map((row: any, index: number) => (
            <tr 
              key={index}
              onClick={() => onRowClick && onRowClick(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns?.map((column: any, colIndex: number) => (
                <td key={colIndex}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  Badge: ({ children, tone, ...props }: any) => <span data-testid="badge" data-tone={tone} {...props}>{children}</span>,
  Spinner: () => <div data-testid="spinner">Loading...</div>,
  LoadingSpinner: () => <div data-testid="spinner">Loading...</div>,
  Toast: ({ message, onDismiss, ...props }: any) => (
    message ? (
      <div data-testid="toast" {...props}>
        <span>{message}</span>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    ) : null
  ),
}));

// Mock Web Components
jest.mock('../../../src/components', () => ({
  Page: ({ children, title, ...props }: any) => <div data-testid="page" data-title={title} {...props}>{children}</div>,
  Card: ({ children, title, ...props }: any) => <div data-testid="card" data-title={title} {...props}>{children}</div>,
  DataTable: ({ columns, data, rows, ...props }: any) => {
    const tableData = data || rows || [];
    return (
      <table data-testid="data-table" {...props}>
        <thead>
          <tr>
            {columns?.map((column: any, index: number) => (
              <th key={index}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData?.map((row: any, index: number) => (
            <tr key={index}>
              {columns?.map((column: any, colIndex: number) => (
                <td key={colIndex}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  },
  Button: ({ children, onClick, ...props }: any) => <button data-testid="button" onClick={onClick} {...props}>{children}</button>,
  Badge: ({ children, status, ...props }: any) => <span data-testid="badge" data-status={status} {...props}>{children}</span>,
  TextField: ({ label, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input data-testid="text-field" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  ),
  Select: ({ options, value, onChange, ...props }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
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
  Layout: ({ children, ...props }: any) => <div data-testid="layout" {...props}>{children}</div>,
  Banner: ({ children, status, ...props }: any) => <div data-testid="banner" data-status={status} {...props}>{children}</div>,
  Spinner: ({ ...props }: any) => <div data-testid="spinner" {...props}>Loading...</div>,
  Modal: ({ open, onClose, children, title, ...props }: any) => 
    open ? (
      <div data-testid="modal" data-title={title} {...props}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
  FormLayout: ({ children, ...props }: any) => <div data-testid="form-layout" {...props}>{children}</div>,
  Checkbox: ({ label, checked, onChange, ...props }: any) => (
    <label>
      <input 
        type="checkbox" 
        data-testid="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        {...props} 
      />
      {label}
    </label>
  ),
  RangeSlider: ({ label, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input 
        type="range" 
        data-testid="range-slider" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        {...props} 
      />
    </div>
  ),
  ResourceList: ({ items, renderItem, ...props }: any) => (
    <div data-testid="resource-list" {...props}>
      {items?.map((item: any, index: number) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
    </div>
  ),
  ResourceItem: ({ children, ...props }: any) => <div data-testid="resource-item" {...props}>{children}</div>,
  Avatar: ({ children, ...props }: any) => <div data-testid="avatar" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  ButtonGroup: ({ children, ...props }: any) => <div data-testid="button-group" {...props}>{children}</div>,
  Popover: ({ children, active, onClose, ...props }: any) => 
    active ? (
      <div data-testid="popover" {...props}>
        <button data-testid="popover-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null,
  ActionList: ({ items, ...props }: any) => (
    <div data-testid="action-list" {...props}>
      {items?.map((item: any, index: number) => (
        <button key={index} onClick={item.onAction}>{item.content}</button>
      ))}
    </div>
  ),
  Icon: ({ source, ...props }: any) => <span data-testid="icon" data-source={source} {...props}>Icon</span>,
  EmptyState: ({ heading, children, ...props }: any) => (
    <div data-testid="empty-state" data-heading={heading} {...props}>{children}</div>
  ),
  SkeletonBodyText: ({ ...props }: any) => <div data-testid="skeleton-body" {...props}>Loading...</div>,
  SkeletonDisplayText: ({ ...props }: any) => <div data-testid="skeleton-display" {...props}>Loading...</div>,
  Toast: ({ content, onDismiss, ...props }: any) => (
    <div data-testid="toast" {...props}>
      {content}
      <button data-testid="toast-dismiss" onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  Frame: ({ children, ...props }: any) => <div data-testid="frame" {...props}>{children}</div>,
}));

// Mock AnalyticsDashboard
jest.mock('../../../src/components/AnalyticsDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="analytics-dashboard">Analytics Dashboard</div>,
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

describe('EnhancedDashboard', () => {
  // const mockSettings = {
  //   delayThreshold: 3,
  //   emailNotifications: true,
  //   smsNotifications: false,
  //   notificationTemplate: 'default',
  //   autoResolveDays: 7,
  //   enableAnalytics: true,
  // };

  const mockAlerts = [
    {
      id: 1,
      orderId: 'ORD-001',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      delayDays: 3,
      delayReason: 'Weather Delay',
      severity: 'high',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'active',
    },
    {
      id: 2,
      orderId: 'ORD-002',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com',
      delayDays: 1,
      delayReason: 'Carrier Issue',
      severity: 'medium',
      createdAt: '2024-01-15T11:00:00Z',
      status: 'resolved',
    },
  ];

  const mockOrders = [
    {
      id: 1,
      orderNumber: 'ORD-001',
      customerName: 'John Doe',
      totalAmount: 299.99,
      createdAt: '2024-01-10T10:00:00Z',
      status: 'shipped',
      carrierCode: 'UPS',
      trackingNumber: '1Z999AA1234567890',
      currency: 'USD',
    },
    {
      id: 2,
      orderNumber: 'ORD-002',
      customerName: 'Jane Smith',
      totalAmount: 149.99,
      createdAt: '2024-01-12T14:00:00Z',
      status: 'delivered',
      carrierCode: 'FedEx',
      trackingNumber: '1234567890123456',
      currency: 'USD',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsAPI.getMetrics.mockResolvedValue({});
    mockAnalyticsAPI.getAlerts.mockResolvedValue(mockAlerts);
    mockAnalyticsAPI.getOrders.mockResolvedValue(mockOrders);
    mockAnalyticsAPI.updateSettings.mockResolvedValue({});
    mockAnalyticsAPI.testDelayDetection.mockResolvedValue({ success: true });
  });

  it('should render enhanced dashboard with all components', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Check if all main components are rendered
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    mockAnalyticsAPI.getAlerts.mockImplementation(() => new Promise(() => {}));
    
    render(<EnhancedDashboard />);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should handle tab switching between alerts and orders', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
  });

  it('should filter alerts by severity', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Filter by high severity
    const severityFilter = screen.getByTestId('select');
    fireEvent.change(severityFilter, { target: { value: 'high' } });

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });
  });

  it('should search alerts by order number', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Search for specific order
    const searchInput = screen.getByTestId('text-field');
    fireEvent.change(searchInput, { target: { value: 'ORD-001' } });

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });
  });

  it('should open settings modal when settings button is clicked', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  it('should update settings when form is submitted', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Update delay threshold
    const delayThresholdInput = screen.getByDisplayValue('3');
    fireEvent.change(delayThresholdInput, { target: { value: '5' } });

    // Submit form
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

  it('should test delay detection when test button is clicked', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Test delay detection
    const testButton = screen.getByText('Test Delay Detection');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.testDelayDetection).toHaveBeenCalled();
    });
  });

  it('should handle bulk actions on alerts', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
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

  it('should display empty state when no alerts', async() => {
    mockAnalyticsAPI.getAlerts.mockResolvedValue([]);
    
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument();
    });
  });

  it('should handle error state when API fails', async() => {
    mockAnalyticsAPI.getAlerts.mockRejectedValue(new Error('API Error'));
    
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load alerts')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockAnalyticsAPI.getAlerts).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle date range filtering', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Set date range
    const startDateInput = screen.getByTestId('start-date-input');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(mockAnalyticsAPI.getAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
        }),
      );
    });
  });

  it('should display alert statistics', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Check if statistics are displayed
    expect(screen.getByText('2')).toBeInTheDocument(); // total alerts
    const ones = screen.getAllByText('1');
    expect(ones).toHaveLength(2); // active alerts and resolved alerts
  });

  it('should handle responsive design', async() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<EnhancedDashboard />);

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const firstButton = screen.getAllByTestId('button')[0];
    firstButton.focus();
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('should display order details when order is clicked', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Switch to orders tab
    const ordersTab = screen.getByTestId('tab-orders');
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click on order
    const orderRow = screen.getByText('ORD-001');
    fireEvent.click(orderRow);

    await waitFor(() => {
      expect(screen.getByText('Order Details')).toBeInTheDocument();
    });
  });

  it('should handle export functionality', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Export alerts
    const exportButton = screen.getByText('Export Alerts');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export started')).toBeInTheDocument();
    });
  });

  it('should handle real-time updates', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Simulate real-time update
    const newAlert = {
      id: 3,
      orderId: 'ORD-003',
      customerName: 'Bob Johnson',
      customerEmail: 'bob@example.com',
      delayDays: 2,
      delayReason: 'Customs Hold',
      severity: 'medium',
      createdAt: '2024-01-15T12:00:00Z',
      status: 'active',
    };

    mockAnalyticsAPI.getAlerts.mockResolvedValue([...mockAlerts, newAlert]);

    // Simulate WebSocket update
    fireEvent(window, new Event('message'));

    await waitFor(() => {
      expect(screen.getByText('ORD-003')).toBeInTheDocument();
    });
  });

  it('should handle settings validation', async() => {
    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Try to set invalid delay threshold
    const delayThresholdInput = screen.getByDisplayValue('3');
    fireEvent.change(delayThresholdInput, { target: { value: '-1' } });

    // Submit form
    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Delay threshold must be positive')).toBeInTheDocument();
    });
  });

  it('should handle pagination', async() => {
    // Mock large dataset
    const largeAlerts = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      order_number: `ORD-${String(i + 1).padStart(3, '0')}`,
      customer_name: `Customer ${i + 1}`,
      customer_email: `customer${i + 1}@example.com`,
      delay_days: Math.floor(Math.random() * 5) + 1,
      delay_reason: 'Test Delay',
      severity: 'medium',
      created_at: '2024-01-15T10:00:00Z',
      status: 'active',
    }));

    mockAnalyticsAPI.getAlerts.mockResolvedValue(largeAlerts);

    render(<EnhancedDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Dashboard')).toBeInTheDocument();
    });

    // Check if pagination is displayed
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });
});
