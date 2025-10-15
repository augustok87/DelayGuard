// Mock data for testing React components migration

export const mockAppSettings = {
  delayThreshold: 3,
  emailNotifications: true,
  smsNotifications: false,
  notificationTemplate: 'Your order is delayed',
  autoResolveDays: 7,
  enableAnalytics: true,
};

export const mockDelayAlerts = [
  {
    id: 'alert-1',
    orderId: 'order-123',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    orderDate: '2025-01-01',
    expectedDelivery: '2025-01-03',
    delayDays: 5,
    status: 'active' as const,
    severity: 'high' as const,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'alert-2',
    orderId: 'order-456',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    orderDate: '2025-01-02',
    expectedDelivery: '2025-01-04',
    delayDays: 3,
    status: 'resolved' as const,
    severity: 'medium' as const,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

export const mockOrders = [
  {
    id: 'order-123',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: 'shipped',
    trackingNumber: 'TRK-123',
    estimatedDelivery: '2025-01-05',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'order-456',
    orderNumber: 'ORD-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: 'delivered',
    trackingNumber: 'TRK-456',
    estimatedDelivery: '2025-01-03',
    createdAt: '2025-01-02T00:00:00Z',
  },
];

export const mockStatsData = {
  totalAlerts: 12,
  activeAlerts: 3,
  resolvedAlerts: 9,
  avgResolutionTime: '2.3 days',
  customerSatisfaction: '94%',
  supportTicketReduction: '35%',
};

export const mockTabItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    content: 'Dashboard content',
    icon: '📊',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    content: 'Alerts content',
    icon: '🚨',
  },
  {
    id: 'orders',
    label: 'Orders',
    content: 'Orders content',
    icon: '📦',
  },
];

export const mockDataTableColumns = [
  {
    key: 'id',
    title: 'ID',
    sortable: true,
    width: '100px',
  },
  {
    key: 'name',
    title: 'Name',
    sortable: true,
  },
  {
    key: 'status',
    title: 'Status',
    sortable: false,
    width: '120px',
    render: (value: string) => `status-${value.toLowerCase()}`,
  },
];

export const mockDataTableData = [
  { id: '1', name: 'Item 1', status: 'Active' },
  { id: '2', name: 'Item 2', status: 'Inactive' },
  { id: '3', name: 'Item 3', status: 'Pending' },
];

// Mock functions
export const mockFunctions = {
  onSave: jest.fn(),
  onTest: jest.fn(),
  onConnect: jest.fn(),
  onAlertAction: jest.fn(),
  onOrderAction: jest.fn(),
  onSettingsChange: jest.fn(),
  onTabChange: jest.fn(),
  onSort: jest.fn(),
  onRowClick: jest.fn(),
  onClose: jest.fn(),
};
