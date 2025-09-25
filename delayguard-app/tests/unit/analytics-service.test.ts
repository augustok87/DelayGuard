import { AnalyticsService } from '../../src/services/analytics-service';
import { AppConfig } from '../../src/types';

const mockConfig: AppConfig = {
  shopify: {
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    scopes: ['read_orders']
  },
  database: {
    url: 'postgresql://test:test@localhost:5432/test'
  },
  redis: {
    url: 'redis://localhost:6379'
  },
  shipengine: {
    apiKey: 'test-shipengine-key'
  },
  sendgrid: {
    apiKey: 'test-sendgrid-key'
  },
  twilio: {
    accountSid: 'test-sid',
    authToken: 'test-token',
    phoneNumber: '+1234567890'
  }
};

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    // Get the mocked instances
    const { Pool } = require('pg');
    const Redis = require('ioredis');
    
    mockDb = new Pool({ connectionString: mockConfig.database.url });
    mockRedis = new Redis(mockConfig.redis.url);
    
    analyticsService = new AnalyticsService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnalyticsMetrics', () => {
    it('should return analytics metrics for a shop', async () => {
      const shopId = 'test-shop';
      const timeRange = '30d';
      
      // Mock database responses
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // totalOrders
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // totalAlerts
        .mockResolvedValueOnce({ 
          rows: [{ low: '5', medium: '3', high: '2', critical: '0' }] 
        }) // alertsBySeverity
        .mockResolvedValueOnce({ 
          rows: [{ delay_reason: 'weather', count: '5' }] 
        }) // alertsByReason
        .mockResolvedValueOnce({ rows: [{ avg_delay: '2.5' }] }) // averageDelayDays
        .mockResolvedValueOnce({ 
          rows: [{ email_rate: '0.95', sms_rate: '0.90' }] 
        }) // notificationSuccessRate
        .mockResolvedValueOnce({ 
          rows: [{ total_value: '5000', avg_order_value: '50', potential_loss: '500' }] 
        }) // revenueImpact
        .mockResolvedValueOnce({ 
          rows: [{ 
            date: '2024-01-01', 
            orders: '10', 
            alerts: '1', 
            revenue: '500' 
          }] 
        }); // timeSeriesData

      // Mock Redis responses
      mockRedis.get.mockResolvedValue(null); // No cache
      mockRedis.setex.mockResolvedValue('OK');

      const result = await analyticsService.getAnalyticsMetrics(shopId, timeRange);

      expect(result).toEqual({
        totalOrders: 100,
        totalAlerts: 10,
        alertsBySeverity: {
          low: 5,
          medium: 3,
          high: 2,
          critical: 0
        },
        alertsByReason: {
          weather: 5
        },
        averageDelayDays: 2.5,
        notificationSuccessRate: {
          email: 95,
          sms: 90
        },
        revenueImpact: {
          totalValue: 5000,
          averageOrderValue: 50,
          potentialLoss: 500
        },
        performanceMetrics: {
          averageResponseTime: 0,
          successRate: 100,
          errorRate: 0
        },
        timeSeriesData: [{
          date: '2024-01-01',
          orders: 10,
          alerts: 1,
          revenue: 500
        }]
      });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `analytics:${shopId}:${timeRange}`,
        300,
        expect.any(String)
      );
    });

    it('should return cached data when available', async () => {
      const shopId = 'test-shop';
      const timeRange = '30d';
      const cachedData = {
        totalOrders: 50,
        totalAlerts: 5,
        alertsBySeverity: { low: 3, medium: 2, high: 0, critical: 0 },
        alertsByReason: {},
        averageDelayDays: 1.5,
        notificationSuccessRate: { email: 98, sms: 95 },
        revenueImpact: { totalValue: 2500, averageOrderValue: 50, potentialLoss: 250 },
        performanceMetrics: { averageResponseTime: 45, successRate: 99, errorRate: 1 },
        timeSeriesData: []
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await analyticsService.getAnalyticsMetrics(shopId, timeRange);

      expect(result).toEqual(cachedData);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const shopId = 'test-shop';
      const timeRange = '30d';

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));
      mockRedis.get.mockResolvedValue(null);

      await expect(analyticsService.getAnalyticsMetrics(shopId, timeRange))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics', async () => {
      const shopId = 'test-shop';
      
      // Mock database responses
      mockDb.query.mockResolvedValue({ rows: [{ count: '5' }] }); // activeAlerts
      
      // Mock Redis responses
      mockRedis.llen.mockResolvedValue(10); // queueSize
      mockRedis.get
        .mockResolvedValueOnce('25.5') // processingRate
        .mockResolvedValueOnce('1.2') // errorRate
        .mockResolvedValueOnce('45.0'); // responseTime

      const result = await analyticsService.getRealTimeMetrics(shopId);

      expect(result).toEqual({
        activeAlerts: 5,
        queueSize: 10,
        processingRate: 25.5,
        errorRate: 1.2,
        memoryUsage: expect.any(Number),
        responseTime: 45.0
      });
    });

    it('should return cached data when available', async () => {
      const shopId = 'test-shop';
      const cachedData = {
        activeAlerts: 3,
        queueSize: 5,
        processingRate: 30.0,
        errorRate: 0.5,
        memoryUsage: 128,
        responseTime: 35.0
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await analyticsService.getRealTimeMetrics(shopId);

      expect(result).toEqual(cachedData);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries for a shop', async () => {
      const shopId = 'test-shop';
      
      mockRedis.keys.mockResolvedValue([
        'analytics:test-shop:30d',
        'realtime:test-shop',
        'metrics:response_time:test-shop'
      ]);
      mockRedis.del.mockResolvedValue(3);

      await analyticsService.clearCache(shopId);

      expect(mockRedis.keys).toHaveBeenCalledWith('analytics:test-shop:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('realtime:test-shop');
      expect(mockRedis.keys).toHaveBeenCalledWith('metrics:*:test-shop');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'analytics:test-shop:30d',
        'realtime:test-shop',
        'metrics:response_time:test-shop'
      );
    });
  });
});
