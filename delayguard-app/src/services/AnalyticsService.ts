/**
 * Analytics Service
 * 
 * Service for handling analytics data, metrics, and reporting functionality.
 * Provides methods for fetching alerts, orders, metrics, and updating settings.
 */

export interface Alert {
  id: string;
  orderId: string;
  customerName: string;
  delayDays: number;
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrierCode: string;
  createdAt: string;
}

export interface Metrics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  averageDelayDays: number;
}

export interface Settings {
  delayThreshold: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  highContrast: boolean;
  largeText: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  notificationTemplate: string;
}

export interface TestDelayDetectionResult {
  success: boolean;
  message?: string;
}

export interface AnalyticsMetrics {
  totalOrders: number;
  totalAlerts: number;
  averageDelayDays: number;
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  revenueImpact: {
    totalValue: number;
    averageOrderValue: number;
    potentialLoss: number;
  };
  notificationSuccessRate: {
    email: number;
    sms: number;
  };
}

export interface RealTimeMetrics {
  activeAlerts: number;
  responseTime: number;
  errorRate: number;
  memoryUsage: number;
}

export class AnalyticsService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = '/api', apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Fetch alerts with optional filtering
   */
  async getAlerts(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }): Promise<Alert[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`${this.baseUrl}/alerts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }

  /**
   * Fetch orders with optional filtering
   */
  async getOrders(filters?: {
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<Order[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`${this.baseUrl}/orders?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Fetch analytics metrics
   */
  async getMetrics(): Promise<Metrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Settings): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Test delay detection functionality
   */
  async testDelayDetection(): Promise<TestDelayDetectionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/test-delay-detection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to test delay detection: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error testing delay detection:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve alert: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss alert: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  }

  /**
   * Export alerts to CSV
   */
  async exportAlerts(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`${this.baseUrl}/alerts/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export alerts: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting alerts:', error);
      throw error;
    }
  }

  /**
   * Get analytics metrics for a specific shop and time range
   */
  async getAnalyticsMetrics(shopId: string, timeRange: '7d' | '30d' | '90d' | '1y'): Promise<AnalyticsMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics?shop=${shopId}&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics for a specific shop
   */
  async getRealTimeMetrics(shopId: string): Promise<RealTimeMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/realtime?shop=${shopId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Clear analytics cache for a specific shop
   */
  async clearCache(shopId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/cache?shop=${shopId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear analytics cache: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error clearing analytics cache:', error);
      throw error;
    }
  }
}

// Export a default instance
export const analyticsService = new AnalyticsService();
