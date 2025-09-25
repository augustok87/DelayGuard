import request from 'supertest';
import { app } from '../../src/server';

// Mock external dependencies
jest.mock('../../src/services/analytics-service');
jest.mock('../../src/services/optimized-cache');
jest.mock('../../src/services/optimized-database');

describe('Analytics Integration Tests', () => {
  const mockShop = 'test-shop.myshopify.com';
  const mockSession = {
    shop: mockShop,
    accessToken: 'mock-access-token'
  };

  beforeEach(() => {
    // Mock Shopify session
    jest.spyOn(require('@shopify/koa-shopify-auth'), 'verifyRequest')
      .mockImplementation(() => (ctx: any, next: any) => {
        ctx.state = { shopify: { session: mockSession } };
        return next();
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/analytics', () => {
    it('should return analytics metrics for a shop', async () => {
      const mockMetrics = {
        totalOrders: 100,
        totalAlerts: 10,
        alertsBySeverity: {
          low: 5,
          medium: 3,
          high: 2,
          critical: 0
        },
        alertsByReason: {
          weather: 5,
          carrier_delay: 3,
          customs: 2
        },
        averageDelayDays: 2.5,
        notificationSuccessRate: {
          email: 95.5,
          sms: 90.0
        },
        revenueImpact: {
          totalValue: 50000,
          averageOrderValue: 500,
          potentialLoss: 5000
        },
        performanceMetrics: {
          averageResponseTime: 45.0,
          successRate: 99.2,
          errorRate: 0.8
        },
        timeSeriesData: [
          {
            date: '2024-01-01',
            orders: 10,
            alerts: 1,
            revenue: 5000
          }
        ]
      };

      // Mock the analytics service
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue(mockMetrics)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics?timeRange=30d')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockMetrics,
        timeRange: '30d',
        generatedAt: expect.any(String)
      });
    });

    it('should handle analytics service errors', async () => {
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics?timeRange=30d')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch analytics data'
      });
    });

    it('should validate time range parameter', async () => {
      const response = await request(app)
        .get('/api/analytics?timeRange=invalid')
        .expect(200); // Should still work with default

      expect(response.body.timeRange).toBe('invalid');
    });
  });

  describe('GET /api/analytics/realtime', () => {
    it('should return real-time metrics', async () => {
      const mockRealtimeMetrics = {
        activeAlerts: 5,
        queueSize: 10,
        processingRate: 25.5,
        errorRate: 1.2,
        memoryUsage: 128,
        responseTime: 45.0
      };

      const mockAnalyticsService = {
        getRealTimeMetrics: jest.fn().mockResolvedValue(mockRealtimeMetrics)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics/realtime')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockRealtimeMetrics,
        generatedAt: expect.any(String)
      });
    });
  });

  describe('GET /api/analytics/summary', () => {
    it('should return analytics summary', async () => {
      const mockMetrics = {
        totalOrders: 100,
        totalAlerts: 10,
        averageDelayDays: 2.5,
        revenueImpact: {
          totalValue: 50000,
          averageOrderValue: 500,
          potentialLoss: 5000
        },
        performanceMetrics: {
          averageResponseTime: 45.0,
          successRate: 99.2,
          errorRate: 0.8
        },
        notificationSuccessRate: {
          email: 95.5,
          sms: 90.0
        }
      };

      const mockRealtimeMetrics = {
        activeAlerts: 5,
        queueSize: 10,
        processingRate: 25.5,
        errorRate: 1.2,
        memoryUsage: 128,
        responseTime: 45.0
      };

      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue(mockMetrics),
        getRealTimeMetrics: jest.fn().mockResolvedValue(mockRealtimeMetrics)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          overview: {
            totalOrders: 100,
            totalAlerts: 10,
            activeAlerts: 5,
            averageDelayDays: 2.5
          },
          performance: {
            responseTime: 45.0,
            successRate: 99.2,
            errorRate: 1.2,
            memoryUsage: 128
          },
          revenue: {
            totalValue: 50000,
            averageOrderValue: 500,
            potentialLoss: 5000
          },
          notifications: {
            emailSuccessRate: 95.5,
            smsSuccessRate: 90.0
          }
        },
        generatedAt: expect.any(String)
      });
    });
  });

  describe('DELETE /api/analytics/cache', () => {
    it('should clear analytics cache', async () => {
      const mockAnalyticsService = {
        clearCache: jest.fn().mockResolvedValue(undefined)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .delete('/api/analytics/cache')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Analytics cache cleared successfully'
      });
    });
  });

  describe('GET /api/analytics/export', () => {
    it('should export analytics data as JSON', async () => {
      const mockMetrics = {
        totalOrders: 100,
        totalAlerts: 10,
        averageDelayDays: 2.5
      };

      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue(mockMetrics)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics/export?format=json&timeRange=30d')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockMetrics,
        timeRange: '30d',
        exportedAt: expect.any(String)
      });
    });

    it('should export analytics data as CSV', async () => {
      const mockMetrics = {
        totalOrders: 100,
        totalAlerts: 10,
        averageDelayDays: 2.5,
        notificationSuccessRate: {
          email: 95.5,
          sms: 90.0
        },
        revenueImpact: {
          totalValue: 50000,
          averageOrderValue: 500,
          potentialLoss: 5000
        },
        performanceMetrics: {
          averageResponseTime: 45.0,
          successRate: 99.2,
          errorRate: 0.8
        }
      };

      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue(mockMetrics)
      };
      
      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      const response = await request(app)
        .get('/api/analytics/export?format=csv&timeRange=30d')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Metric,Value,Category');
      expect(response.text).toContain('Total Orders,100,Overview');
    });
  });

  describe('Error handling', () => {
    it('should handle missing shop ID', async () => {
      // Mock missing session
      jest.spyOn(require('@shopify/koa-shopify-auth'), 'verifyRequest')
        .mockImplementation(() => (ctx: any, next: any) => {
          ctx.state = { shopify: {} };
          return next();
        });

      const response = await request(app)
        .get('/api/analytics')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Shop ID is required'
      });
    });

    it('should handle service initialization errors', async () => {
      // Mock service constructor error
      jest.doMock('../../src/services/analytics-service', () => {
        throw new Error('Service initialization failed');
      });

      const response = await request(app)
        .get('/api/analytics')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch analytics data'
      });
    });
  });
});
