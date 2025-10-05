import { Pool } from 'pg';
const Redis = require('ioredis');
import { AppConfig } from '../types';

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
  revenueImpact: {
    totalValue: number;
    averageOrderValue: number;
    potentialLoss: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
  timeSeriesData: {
    date: string;
    orders: number;
    alerts: number;
    revenue: number;
  }[];
}

export interface RealTimeMetrics {
  activeAlerts: number;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  memoryUsage: number;
  responseTime: number;
}

export class AnalyticsService {
  private db: Pool;
  private redis: any;

  constructor(config: AppConfig) {
    this.db = new Pool({ connectionString: config.database.url });
    this.redis = new (Redis as any)(config.redis.url);
  }

  async getAnalyticsMetrics(shopId: string, timeRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<AnalyticsMetrics> {
    const cacheKey = `analytics:${shopId}:${timeRange}`;
    
    // Try to get from cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = this.getDaysFromTimeRange(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalOrders,
      totalAlerts,
      alertsBySeverity,
      alertsByReason,
      averageDelayDays,
      notificationSuccessRate,
      revenueImpact,
      performanceMetrics,
      timeSeriesData
    ] = await Promise.all([
      this.getTotalOrders(shopId, startDate),
      this.getTotalAlerts(shopId, startDate),
      this.getAlertsBySeverity(shopId, startDate),
      this.getAlertsByReason(shopId, startDate),
      this.getAverageDelayDays(shopId, startDate),
      this.getNotificationSuccessRate(shopId, startDate),
      this.getRevenueImpact(shopId, startDate),
      this.getPerformanceMetrics(shopId, startDate),
      this.getTimeSeriesData(shopId, startDate, days)
    ]);

    const metrics: AnalyticsMetrics = {
      totalOrders,
      totalAlerts,
      alertsBySeverity,
      alertsByReason,
      averageDelayDays,
      notificationSuccessRate,
      revenueImpact,
      performanceMetrics,
      timeSeriesData
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(metrics));
    
    return metrics;
  }

  async getRealTimeMetrics(shopId: string): Promise<RealTimeMetrics> {
    const cacheKey = `realtime:${shopId}`;
    
    // Try to get from cache first (1 minute cache)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      activeAlerts,
      queueSize,
      processingRate,
      errorRate,
      memoryUsage,
      responseTime
    ] = await Promise.all([
      this.getActiveAlerts(shopId),
      this.getQueueSize(),
      this.getProcessingRate(shopId),
      this.getErrorRate(shopId),
      this.getMemoryUsage(),
      this.getResponseTime(shopId)
    ]);

    const metrics: RealTimeMetrics = {
      activeAlerts,
      queueSize,
      processingRate,
      errorRate,
      memoryUsage,
      responseTime
    };

    // Cache for 1 minute
    await this.redis.setex(cacheKey, 60, JSON.stringify(metrics));
    
    return metrics;
  }

  private getDaysFromTimeRange(timeRange: string): number {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private async getTotalOrders(shopId: string, startDate: Date): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM orders WHERE shop_id = $1 AND created_at >= $2',
      [shopId, startDate]
    );
    return parseInt(result.rows[0].count);
  }

  private async getTotalAlerts(shopId: string, startDate: Date): Promise<number> {
    const result = await this.db.query(
      'SELECT COUNT(*) as count FROM delay_alerts WHERE shop_id = $1 AND created_at >= $2',
      [shopId, startDate]
    );
    return parseInt(result.rows[0].count);
  }

  private async getAlertsBySeverity(shopId: string, startDate: Date): Promise<{ low: number; medium: number; high: number; critical: number }> {
    const result = await this.db.query(`
      SELECT 
        SUM(CASE WHEN delay_days <= 2 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN delay_days > 2 AND delay_days <= 5 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN delay_days > 5 AND delay_days <= 10 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN delay_days > 10 THEN 1 ELSE 0 END) as critical
      FROM delay_alerts 
      WHERE shop_id = $1 AND created_at >= $2
    `, [shopId, startDate]);

    const row = result.rows[0];
    return {
      low: parseInt(row.low) || 0,
      medium: parseInt(row.medium) || 0,
      high: parseInt(row.high) || 0,
      critical: parseInt(row.critical) || 0
    };
  }

  private async getAlertsByReason(shopId: string, startDate: Date): Promise<{ [reason: string]: number }> {
    const result = await this.db.query(`
      SELECT delay_reason, COUNT(*) as count
      FROM delay_alerts 
      WHERE shop_id = $1 AND created_at >= $2
      GROUP BY delay_reason
      ORDER BY count DESC
    `, [shopId, startDate]);

    const reasons: { [reason: string]: number } = {};
    result.rows.forEach(row => {
      reasons[row.delay_reason] = parseInt(row.count);
    });
    return reasons;
  }

  private async getAverageDelayDays(shopId: string, startDate: Date): Promise<number> {
    const result = await this.db.query(`
      SELECT AVG(delay_days) as avg_delay
      FROM delay_alerts 
      WHERE shop_id = $1 AND created_at >= $2
    `, [shopId, startDate]);

    return parseFloat(result.rows[0].avg_delay) || 0;
  }

  private async getNotificationSuccessRate(shopId: string, startDate: Date): Promise<{ email: number; sms: number }> {
    const result = await this.db.query(`
      SELECT 
        AVG(CASE WHEN email_sent THEN 1 ELSE 0 END) as email_rate,
        AVG(CASE WHEN sms_sent THEN 1 ELSE 0 END) as sms_rate
      FROM delay_alerts 
      WHERE shop_id = $1 AND created_at >= $2
    `, [shopId, startDate]);

    const row = result.rows[0];
    return {
      email: parseFloat(row.email_rate) * 100 || 0,
      sms: parseFloat(row.sms_rate) * 100 || 0
    };
  }

  private async getRevenueImpact(shopId: string, startDate: Date): Promise<{ totalValue: number; averageOrderValue: number; potentialLoss: number }> {
    const result = await this.db.query(`
      SELECT 
        SUM(o.total_amount) as total_value,
        AVG(o.total_amount) as avg_order_value,
        SUM(CASE WHEN da.id IS NOT NULL THEN o.total_amount * 0.1 ELSE 0 END) as potential_loss
      FROM orders o
      LEFT JOIN delay_alerts da ON o.id = da.order_id
      WHERE o.shop_id = $1 AND o.created_at >= $2
    `, [shopId, startDate]);

    const row = result.rows[0];
    return {
      totalValue: parseFloat(row.total_value) || 0,
      averageOrderValue: parseFloat(row.avg_order_value) || 0,
      potentialLoss: parseFloat(row.potential_loss) || 0
    };
  }

  private async getPerformanceMetrics(shopId: string, startDate: Date): Promise<{ averageResponseTime: number; successRate: number; errorRate: number }> {
    // Get from Redis cache or calculate
    const responseTime = await this.redis.get(`metrics:response_time:${shopId}`) || '0';
    const successRate = await this.redis.get(`metrics:success_rate:${shopId}`) || '100';
    const errorRate = await this.redis.get(`metrics:error_rate:${shopId}`) || '0';

    return {
      averageResponseTime: parseFloat(responseTime),
      successRate: parseFloat(successRate),
      errorRate: parseFloat(errorRate)
    };
  }

  private async getTimeSeriesData(shopId: string, startDate: Date, days: number): Promise<{ date: string; orders: number; alerts: number; revenue: number }[]> {
    const result = await this.db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT o.id) as orders,
        COUNT(DISTINCT da.id) as alerts,
        COALESCE(SUM(o.total_amount), 0) as revenue
      FROM orders o
      LEFT JOIN delay_alerts da ON o.id = da.order_id
      WHERE o.shop_id = $1 AND o.created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [shopId, startDate]);

    return result.rows.map(row => ({
      date: row.date,
      orders: parseInt(row.orders),
      alerts: parseInt(row.alerts),
      revenue: parseFloat(row.revenue)
    }));
  }

  private async getActiveAlerts(shopId: string): Promise<number> {
    const result = await this.db.query(`
      SELECT COUNT(*) as count
      FROM delay_alerts 
      WHERE shop_id = $1 AND resolved_at IS NULL
    `, [shopId]);
    return parseInt(result.rows[0].count);
  }

  private async getQueueSize(): Promise<number> {
    const waiting = await this.redis.llen('delay-check:waiting');
    const active = await this.redis.llen('delay-check:active');
    return waiting + active;
  }

  private async getProcessingRate(shopId: string): Promise<number> {
    const rate = await this.redis.get(`metrics:processing_rate:${shopId}`) || '0';
    return parseFloat(rate);
  }

  private async getErrorRate(shopId: string): Promise<number> {
    const rate = await this.redis.get(`metrics:error_rate:${shopId}`) || '0';
    return parseFloat(rate);
  }

  private async getMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  private async getResponseTime(shopId: string): Promise<number> {
    const time = await this.redis.get(`metrics:response_time:${shopId}`) || '0';
    return parseFloat(time);
  }

  async clearCache(shopId: string): Promise<void> {
    const patterns = [
      `analytics:${shopId}:*`,
      `realtime:${shopId}`,
      `metrics:*:${shopId}`
    ];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}
