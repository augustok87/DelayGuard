import request from 'supertest';
import { app } from '../../src/server';

// Mock external dependencies
jest.mock('../../src/services/analytics-service');
jest.mock('../../src/services/optimized-cache');
jest.mock('../../src/services/optimized-database');
jest.mock('../../src/services/monitoring-service');

describe('Analytics Dashboard E2E Flow', () => {
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

  describe('Complete Analytics Dashboard Flow', () => {
    it('should provide a complete analytics experience', async () => {
      // Mock comprehensive analytics data
      const mockAnalyticsData = {
        totalOrders: 1500,
        totalAlerts: 45,
        alertsBySeverity: {
          low: 20,
          medium: 15,
          high: 8,
          critical: 2
        },
        alertsByReason: {
          weather: 15,
          carrier_delay: 12,
          customs: 8,
          address_issue: 6,
          package_damage: 4
        },
        averageDelayDays: 3.2,
        notificationSuccessRate: {
          email: 97.5,
          sms: 94.2
        },
        revenueImpact: {
          totalValue: 75000,
          averageOrderValue: 500,
          potentialLoss: 7500
        },
        performanceMetrics: {
          averageResponseTime: 42.5,
          successRate: 99.1,
          errorRate: 0.9
        },
        timeSeriesData: [
          { date: '2024-01-01', orders: 50, alerts: 2, revenue: 25000 },
          { date: '2024-01-02', orders: 45, alerts: 1, revenue: 22500 },
          { date: '2024-01-03', orders: 55, alerts: 3, revenue: 27500 }
        ]
      };

      const mockRealtimeData = {
        activeAlerts: 8,
        queueSize: 15,
        processingRate: 28.5,
        errorRate: 0.8,
        memoryUsage: 256,
        responseTime: 38.2
      };

      const mockMonitoringData = {
        status: 'healthy',
        checks: [
          { name: 'Database', status: 'healthy', responseTime: 15 },
          { name: 'Redis', status: 'healthy', responseTime: 5 },
          { name: 'ShipEngine', status: 'healthy', responseTime: 120 },
          { name: 'SendGrid', status: 'healthy', responseTime: 200 },
          { name: 'Twilio', status: 'healthy', responseTime: 150 }
        ],
        metrics: {
          application: {
            uptime: 86400,
            responseTime: { average: 42.5, p95: 85.0, p99: 120.0 },
            requests: { total: 10000, errors: 90, successRate: 99.1 }
          },
          memory: { used: 256, free: 768, total: 1024, percentage: 25.0 },
          cpu: { usage: 15.5, loadAverage: [0.5, 0.8, 1.2] }
        },
        alerts: []
      };

      // Mock services
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue(mockAnalyticsData),
        getRealTimeMetrics: jest.fn().mockResolvedValue(mockRealtimeData),
        clearCache: jest.fn().mockResolvedValue(undefined)
      };

      const mockMonitoringService = {
        getSystemStatus: jest.fn().mockResolvedValue(mockMonitoringData),
        performHealthChecks: jest.fn().mockResolvedValue(mockMonitoringData.checks)
      };

      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      jest.doMock('../../src/services/monitoring-service', () => ({
        MonitoringService: jest.fn(() => mockMonitoringService)
      }));

      // Test 1: Get analytics overview
      const analyticsResponse = await request(app)
        .get('/api/analytics?timeRange=30d')
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        success: true,
        data: mockAnalyticsData,
        timeRange: '30d'
      });

      // Test 2: Get real-time metrics
      const realtimeResponse = await request(app)
        .get('/api/analytics/realtime')
        .expect(200);

      expect(realtimeResponse.body).toMatchObject({
        success: true,
        data: mockRealtimeData
      });

      // Test 3: Get analytics summary
      const summaryResponse = await request(app)
        .get('/api/analytics/summary')
        .expect(200);

      expect(summaryResponse.body).toMatchObject({
        success: true,
        data: {
          overview: {
            totalOrders: 1500,
            totalAlerts: 45,
            activeAlerts: 8,
            averageDelayDays: 3.2
          },
          performance: {
            responseTime: 42.5,
            successRate: 99.1,
            errorRate: 0.8,
            memoryUsage: 256
          },
          revenue: {
            totalValue: 75000,
            averageOrderValue: 500,
            potentialLoss: 7500
          },
          notifications: {
            emailSuccessRate: 97.5,
            smsSuccessRate: 94.2
          }
        }
      });

      // Test 4: Get system monitoring status
      const monitoringResponse = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(monitoringResponse.body).toMatchObject({
        success: true,
        data: mockMonitoringData
      });

      // Test 5: Export analytics data as JSON
      const exportJsonResponse = await request(app)
        .get('/api/analytics/export?format=json&timeRange=30d')
        .expect(200);

      expect(exportJsonResponse.body).toMatchObject({
        success: true,
        data: mockAnalyticsData,
        format: 'json',
        timeRange: '30d'
      });

      // Test 6: Export analytics data as CSV
      const exportCsvResponse = await request(app)
        .get('/api/analytics/export?format=csv&timeRange=30d')
        .expect(200);

      expect(exportCsvResponse.headers['content-type']).toBe('text/csv');
      expect(exportCsvResponse.headers['content-disposition']).toContain('attachment');
      expect(exportCsvResponse.text).toContain('Metric,Value,Category');
      expect(exportCsvResponse.text).toContain('Total Orders,1500,Overview');

      // Test 7: Clear analytics cache
      const clearCacheResponse = await request(app)
        .delete('/api/analytics/cache')
        .expect(200);

      expect(clearCacheResponse.body).toMatchObject({
        success: true,
        message: 'Analytics cache cleared successfully'
      });

      // Verify all service methods were called
      expect(mockAnalyticsService.getAnalyticsMetrics).toHaveBeenCalledWith(mockShop, '30d');
      expect(mockAnalyticsService.getRealTimeMetrics).toHaveBeenCalledWith(mockShop);
      expect(mockAnalyticsService.clearCache).toHaveBeenCalledWith(mockShop);
      expect(mockMonitoringService.getSystemStatus).toHaveBeenCalled();
    });

    it('should handle different time ranges', async () => {
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue({
          totalOrders: 100,
          totalAlerts: 5,
          averageDelayDays: 2.0
        })
      };

      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      // Test different time ranges
      const timeRanges = ['7d', '30d', '90d', '1y'];
      
      for (const timeRange of timeRanges) {
        await request(app)
          .get(`/api/analytics?timeRange=${timeRange}`)
          .expect(200);

        expect(mockAnalyticsService.getAnalyticsMetrics).toHaveBeenCalledWith(mockShop, timeRange);
      }
    });

    it('should handle analytics service errors gracefully', async () => {
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        getRealTimeMetrics: jest.fn().mockRejectedValue(new Error('Redis connection failed'))
      };

      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      // Test analytics endpoint error handling
      const analyticsResponse = await request(app)
        .get('/api/analytics?timeRange=30d')
        .expect(500);

      expect(analyticsResponse.body).toMatchObject({
        error: 'Failed to fetch analytics data'
      });

      // Test real-time endpoint error handling
      const realtimeResponse = await request(app)
        .get('/api/analytics/realtime')
        .expect(500);

      expect(realtimeResponse.body).toMatchObject({
        error: 'Failed to fetch real-time metrics'
      });
    });

    it('should handle monitoring service errors gracefully', async () => {
      const mockMonitoringService = {
        getSystemStatus: jest.fn().mockRejectedValue(new Error('Monitoring service unavailable')),
        performHealthChecks: jest.fn().mockRejectedValue(new Error('Health checks failed'))
      };

      jest.doMock('../../src/services/monitoring-service', () => ({
        MonitoringService: jest.fn(() => mockMonitoringService)
      }));

      // Test monitoring endpoint error handling
      const monitoringResponse = await request(app)
        .get('/api/monitoring/status')
        .expect(500);

      expect(monitoringResponse.body).toMatchObject({
        error: 'Failed to fetch system status'
      });
    });

    it('should validate export format parameter', async () => {
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockResolvedValue({
          totalOrders: 100,
          totalAlerts: 5
        })
      };

      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      // Test valid formats
      const validFormats = ['json', 'csv'];
      
      for (const format of validFormats) {
        await request(app)
          .get(`/api/analytics/export?format=${format}&timeRange=30d`)
          .expect(200);
      }

      // Test invalid format (should default to JSON)
      await request(app)
        .get('/api/analytics/export?format=invalid&timeRange=30d')
        .expect(200);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockAnalyticsService = {
        getAnalyticsMetrics: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            totalOrders: 100,
            totalAlerts: 5
          }), 100))
        ),
        getRealTimeMetrics: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            activeAlerts: 2,
            queueSize: 5
          }), 50))
        )
      };

      jest.doMock('../../src/services/analytics-service', () => ({
        AnalyticsService: jest.fn(() => mockAnalyticsService)
      }));

      // Make concurrent requests
      const promises = [
        request(app).get('/api/analytics?timeRange=30d'),
        request(app).get('/api/analytics/realtime'),
        request(app).get('/api/analytics/summary')
      ];

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify services were called
      expect(mockAnalyticsService.getAnalyticsMetrics).toHaveBeenCalledTimes(2); // Called twice for analytics and summary
      expect(mockAnalyticsService.getRealTimeMetrics).toHaveBeenCalledTimes(2); // Called twice for realtime and summary
    });
  });
});
