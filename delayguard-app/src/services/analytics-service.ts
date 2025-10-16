export interface AnalyticsMetrics {
  totalOrders: number;
  totalAlerts: number;
  alertsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  alertsByReason: {
    [reason: string]: number;
  };
  averageDelayDays: number;
  notificationSuccessRate: {
    email: number;
    sms: number;
  };
  customerSatisfaction: number;
  resolutionTime: {
    average: number;
    median: number;
  };
}

export class AnalyticsService {
  async getMetrics(dateRange?: { start: string; end: string }): Promise<AnalyticsMetrics> {
    // This will be mocked in tests
    throw new Error('AnalyticsService.getMetrics not implemented');
  }

  async exportData(data: AnalyticsMetrics): Promise<{ success: boolean }> {
    // This will be mocked in tests
    throw new Error('AnalyticsService.exportData not implemented');
  }
}

export const analyticsService = new AnalyticsService();