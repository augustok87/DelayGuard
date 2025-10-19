// Mock data for EnhancedDashboard component
import { DelayAlert, Order, AppSettings, StatsData } from '../../types';

export const mockAlerts: DelayAlert[] = [
  {
    id: 'alert-1',
    orderId: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    delayDays: 2,
    status: 'active',
    priority: 'medium',
    createdAt: '2024-01-20T10:00:00Z',
    trackingNumber: 'TRK123456',
    carrierCode: 'UPS',
  },
  {
    id: 'alert-2',
    orderId: 'ORD-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    delayDays: 5,
    status: 'active',
    priority: 'high',
    createdAt: '2024-01-21T10:00:00Z',
    trackingNumber: 'TRK789012',
    carrierCode: 'FedEx',
  },
  {
    id: 'alert-3',
    orderId: 'ORD-003',
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    delayDays: 1,
    status: 'resolved',
    priority: 'low',
    createdAt: '2024-01-22T10:00:00Z',
    resolvedAt: '2024-01-23T10:00:00Z',
    trackingNumber: 'TRK345678',
    carrierCode: 'DHL',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    orderNumber: 'ORD-001',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    status: 'shipped',
    trackingNumber: 'TRK123456',
    carrierCode: 'UPS',
    createdAt: '2024-01-15T10:00:00Z',
    totalAmount: 99.99,
    currency: 'USD',
  },
  {
    id: 'ORD-002',
    orderNumber: 'ORD-002',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: 'shipped',
    trackingNumber: 'TRK789012',
    carrierCode: 'FedEx',
    createdAt: '2024-01-16T10:00:00Z',
    totalAmount: 149.99,
    currency: 'USD',
  },
];

export const mockSettings: AppSettings = {
  delayThreshold: 3,
  emailNotifications: true,
  smsNotifications: false,
  notificationTemplate: 'Your order #{{orderNumber}} is experiencing a delay. We apologize for the inconvenience.',
  autoResolveDays: 7,
  enableAnalytics: true,
};

export const mockStats: StatsData = {
  totalAlerts: 12,
  activeAlerts: 3,
  resolvedAlerts: 9,
  avgResolutionTime: '2.5 days',
  customerSatisfaction: '94.7%',
  supportTicketReduction: '23%',
  totalOrders: 150,
  delayedOrders: 8,
  revenueImpact: 1250.50,
};
