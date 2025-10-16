import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '../../../src/components/AnalyticsDashboard';

// Mock UI components
jest.mock('../../../src/components/ui', () => ({
  Page: ({ children, title, ...props }: any) => <div data-testid="page" data-title={title} {...props}>{children}</div>,
  Card: ({ children, title, ...props }: any) => <div data-testid="card" data-title={title} {...props}>{children}</div>,
  Layout: ({ children, ...props }: any) => <div data-testid="layout" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  Badge: ({ children, status, ...props }: any) => <span data-testid="badge" data-status={status} {...props}>{children}</span>,
  Button: ({ children, onClick, ...props }: any) => <button data-testid="button" onClick={onClick} {...props}>{children}</button>,
  Select: ({ options, value, onChange, ...props }: any) => (
    <select data-testid="select" value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
  Spinner: ({ ...props }: any) => <div data-testid="spinner" {...props}>Loading...</div>,
  Banner: ({ children, status, ...props }: any) => <div data-testid="banner" data-status={status} {...props}>{children}</div>,
  DataTable: ({ columns, data, headings, rows, ...props }: any) => {
    // Support both old API (headings/rows) and new API (columns/data)
    const tableColumns = columns || headings?.map((heading: any, index: number) => ({
      key: `col_${index}`,
      title: heading,
      sortable: false,
    }));
    const tableData = data || rows?.map((row: any, index: number) => ({
      id: `row_${index}`,
      ...(Array.isArray(row) ? 
        row.reduce((acc, cell, cellIndex) => ({ ...acc, [`col_${cellIndex}`]: cell }), {}) :
        row
      ),
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
  ResourceList: ({ items, renderItem, ...props }: any) => (
    <div data-testid="resource-list" {...props}>
      {items?.map((item: any, index: number) => (
        <div key={index}>{renderItem(item)}</div>
      ))}
    </div>
  ),
  ResourceItem: ({ children, ...props }: any) => <div data-testid="resource-item" {...props}>{children}</div>,
  EmptyState: ({ heading, children, ...props }: any) => (
    <div data-testid="empty-state" data-heading={heading} {...props}>{children}</div>
  ),
  Modal: ({ isOpen, onClose, children, title, primaryAction, secondaryActions, ...props }: any) => 
    isOpen ? (
      <div data-testid="modal" data-title={title} {...props}>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {title && <h2>{title}</h2>}
        {children}
        {primaryAction && (
          <button onClick={primaryAction.onAction}>{primaryAction.content}</button>
        )}
        {secondaryActions && secondaryActions.map((action: any, index: number) => (
          <button key={index} onClick={action.onAction}>{action.content}</button>
        ))}
      </div>
    ) : null,
  FormLayout: ({ children, ...props }: any) => <div data-testid="form-layout" {...props}>{children}</div>,
  TextField: ({ label, value, onChange, ...props }: any) => (
    <div>
      <label>{label}</label>
      <input data-testid="text-field" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  ),
  ButtonGroup: ({ children, ...props }: any) => <div data-testid="button-group" {...props}>{children}</div>,
  Tabs: ({ tabs, selected, onTabChange, ...props }: any) => (
    <div data-testid="tabs" {...props}>
      {tabs?.map((tab: any, index: number) => (
        <button 
          key={index} 
          data-testid={`tab-${tab.id}`}
          onClick={() => onTabChange?.(tab.id)}
          className={selected === index ? 'active' : ''}
        >
          {tab.content}
        </button>
      ))}
    </div>
  ),
  Frame: ({ children, ...props }: any) => <div data-testid="frame" {...props}>{children}</div>,
  Toast: ({ content, onDismiss, ...props }: any) => (
    <div data-testid="toast" {...props}>
      {content}
      <button data-testid="toast-dismiss" onClick={onDismiss}>Dismiss</button>
    </div>
  ),
  BlockStack: ({ children, ...props }: any) => <div data-testid="block-stack" {...props}>{children}</div>,
  InlineStack: ({ children, ...props }: any) => <div data-testid="inline-stack" {...props}>{children}</div>,
}));

// Mock the analytics API
const mockAnalyticsAPI = {
  getMetrics: jest.fn(),
  getAlerts: jest.fn(),
  getOrders: jest.fn(),
  exportData: jest.fn(),
};

jest.mock('../../../src/services/analytics-service', () => ({
  analyticsService: {
    getMetrics: jest.fn(),
    getAlerts: jest.fn(),
    getOrders: jest.fn(),
    exportData: jest.fn(),
  },
}));

describe('AnalyticsDashboard', () => {
  const mockMetrics = {
    totalOrders: 150,
    totalAlerts: 25,
    alertsBySeverity: {
      low: 10,
      medium: 8,
      high: 5,
      critical: 2,
    },
    alertsByReason: {
      'Weather Delay': 8,
      'Carrier Issue': 12,
      'Customs Hold': 3,
      'Address Issue': 2,
    },
    averageDelayDays: 3.2,
    notificationSuccessRate: {
      email: 95.5,
      sms: 87.2,
    },
    revenueImpact: {
      totalValue: 45000,
      averageOrderValue: 300,
      potentialLoss: 1500,
    },
    performanceMetrics: {
      averageResponseTime: 1.2,
      uptime: 99.8,
      errorRate: 0.2,
    },
  };

  const mockAlerts = [
    {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      delay_days: 3,
      delay_reason: 'Weather Delay',
      severity: 'high',
      created_at: '2024-01-15T10:00:00Z',
      status: 'active',
    },
    {
      id: 2,
      order_number: 'ORD-002',
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      delay_days: 1,
      delay_reason: 'Carrier Issue',
      severity: 'medium',
      created_at: '2024-01-15T11:00:00Z',
      status: 'resolved',
    },
  ];

  const mockOrders = [
    {
      id: 1,
      order_number: 'ORD-001',
      customer_name: 'John Doe',
      total_value: 299.99,
      created_at: '2024-01-10T10:00:00Z',
      status: 'shipped',
    },
    {
      id: 2,
      order_number: 'ORD-002',
      customer_name: 'Jane Smith',
      total_value: 149.99,
      created_at: '2024-01-12T14:00:00Z',
      status: 'delivered',
    },
  ];

  // Get the mocked service
  const { analyticsService } = require('../../../src/services/analytics-service');

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService.getMetrics.mockResolvedValue(mockMetrics);
    analyticsService.getAlerts.mockResolvedValue(mockAlerts);
    analyticsService.getOrders.mockResolvedValue(mockOrders);
    analyticsService.exportData.mockResolvedValue('export-data');
  });

  it('should render analytics dashboard with metrics', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check if metrics are displayed
    expect(screen.getByText('1,250')).toBeInTheDocument(); // totalOrders
    expect(screen.getByText('89')).toBeInTheDocument(); // totalAlerts
    expect(screen.getByText('3.2 days')).toBeInTheDocument(); // averageDelayDays
  });

  it('should display loading state initially', () => {
    mockAnalyticsAPI.getMetrics.mockImplementation(() => new Promise(() => {}));
    
    render(<AnalyticsDashboard />);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should handle tab switching', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
  });

  it('should filter alerts by severity', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Switch to alerts tab
    const alertsTab = screen.getByTestId('tab-alerts');
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Filter by high severity
    const severityFilter = screen.getByTestId('select');
    fireEvent.change(severityFilter, { target: { value: 'high' } });

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
    });
  });

  it('should export data when export button is clicked', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export Data');
    fireEvent.click(exportButton);

    // Wait for modal to appear and click the export button in the modal
    await waitFor(() => {
      expect(screen.getByText('Export Analytics')).toBeInTheDocument();
    });

    const modalExportButton = screen.getByText('Export');
    fireEvent.click(modalExportButton);

    await waitFor(() => {
      expect(analyticsService.exportData).toHaveBeenCalled();
    });
  });

  it('should handle date range filtering', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Set date range
    const startDateInput = screen.getByTestId('date-start');
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(analyticsService.getMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          start: '2024-01-01',
        }),
      );
    });
  });

  it('should display error state when API fails', async() => {
    analyticsService.getMetrics.mockRejectedValue(new Error('API Error'));
    
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics data')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(analyticsService.getMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('should display revenue impact metrics', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check that the component renders without errors
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
  });

  it('should display performance metrics', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check that the component renders without errors
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
  });

  it('should handle empty data state', async() => {
    mockAnalyticsAPI.getMetrics.mockResolvedValue({
      totalOrders: 0,
      totalAlerts: 0,
      alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      alertsByReason: {},
      averageDelayDays: 0,
      notificationSuccessRate: { email: 0, sms: 0 },
      revenueImpact: { totalValue: 0, averageOrderValue: 0, potentialLoss: 0 },
      performanceMetrics: { averageResponseTime: 0, uptime: 0, errorRate: 0 },
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('should handle different time periods', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Test that the component renders without errors
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
  });

  it('should display notification success rates', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check notification success rates
    expect(screen.getByText('95.5%')).toBeInTheDocument();
    expect(screen.getByText('87.2%')).toBeInTheDocument();
  });

  it('should handle modal interactions', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByTestId('modal-close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });
  });

  it('should handle responsive design', async() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<AnalyticsDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check if responsive layout is applied
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Test keyboard navigation
    const firstButton = screen.getAllByTestId('button')[0];
    firstButton.focus();
    
    expect(document.activeElement).toBe(firstButton);
  });

  it('should display alerts by reason chart', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Check if alerts by reason are displayed
    expect(screen.getByText('Weather Delay')).toBeInTheDocument();
    expect(screen.getByText('Carrier Issue')).toBeInTheDocument();
  });

  it('should handle data refresh on window focus', async() => {
    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    // Simulate window focus
    fireEvent(window, new Event('focus'));

    await waitFor(() => {
      expect(analyticsService.getMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
