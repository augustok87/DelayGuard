import { MonitoringService } from '../../../src/services/monitoring-service';
import { AppConfig } from '../../../src/types';

// Mock the dependencies
jest.mock('ioredis');
jest.mock('pg');

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'test',
        password: 'test',
      },
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'test',
      },
      shopify: {
        apiKey: 'test',
        apiSecret: 'test',
        scopes: ['read_orders'],
      },
      sendgrid: {
        apiKey: 'test',
      },
      twilio: {
        accountSid: 'test',
        authToken: 'test',
        phoneNumber: '+1234567890',
      },
      shipengine: {
        apiKey: 'test',
      },
    };

    monitoringService = new MonitoringService(mockConfig);
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async () => {
      const healthChecks = await monitoringService.performHealthChecks();

      expect(healthChecks).toHaveLength(4); // database, redis, queue, external APIs
      expect(healthChecks.every(check => check.status === 'healthy')).toBe(true);
    });

    it('should detect unhealthy services', async () => {
      // Mock Redis connection failure
      const mockRedis = require('ioredis');
      mockRedis.prototype.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Connection failed');
    });

    it('should detect degraded services', async () => {
      // Mock slow database response
      const mockPool = require('pg').Pool;
      mockPool.prototype.query = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 2000))
      );

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('degraded');
      expect(dbCheck?.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async () => {
      const metrics = await monitoringService.collectSystemMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('database');
      expect(metrics).toHaveProperty('redis');
      expect(metrics).toHaveProperty('application');

      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
    });
  });

  describe('checkAlerts', () => {
    it('should check alert rules and generate alerts', async () => {
      // Mock high memory usage
      const originalProcess = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 100, // 100MB
        heapTotal: 1024 * 1024 * 50,
        heapUsed: 1024 * 1024 * 40,
        external: 1024 * 1024 * 10,
        arrayBuffers: 1024 * 1024 * 5,
      });

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'high_memory_usage',
        severity: 'high',
        message: expect.stringContaining('Memory usage is high'),
      });

      // Restore original function
      process.memoryUsage = originalProcess;
    });

    it('should not generate alerts when metrics are within thresholds', async () => {
      // Mock normal memory usage
      const originalProcess = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 10, // 10MB
        heapTotal: 1024 * 1024 * 5,
        heapUsed: 1024 * 1024 * 3,
        external: 1024 * 1024 * 2,
        arrayBuffers: 1024 * 1024 * 1,
      });

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);

      // Restore original function
      process.memoryUsage = originalProcess;
    });
  });

  describe('getSystemStatus', () => {
    it('should return overall system status', async () => {
      const status = await monitoringService.getSystemStatus();

      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('checks');
      expect(status.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(Array.isArray(status.checks)).toBe(true);
    });

    it('should return degraded status when some checks fail', async () => {
      // Mock one service failure
      const mockRedis = require('ioredis');
      mockRedis.prototype.ping = jest.fn().mockRejectedValue(new Error('Redis unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.overall).toBe('degraded');
    });

    it('should return unhealthy status when critical checks fail', async () => {
      // Mock database failure
      const mockPool = require('pg').Pool;
      mockPool.prototype.query = jest.fn().mockRejectedValue(new Error('Database unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.overall).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockPool = require('pg').Pool;
      mockPool.prototype.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database connection failed');
    });

    it('should handle Redis errors gracefully', async () => {
      const mockRedis = require('ioredis');
      mockRedis.prototype.ping = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis connection failed');
    });

    it('should handle external API errors gracefully', async () => {
      // Mock fetch to simulate external API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('External API unavailable'));

      const healthChecks = await monitoringService.performHealthChecks();

      const apiCheck = healthChecks.find(check => check.name === 'External APIs');
      expect(apiCheck?.status).toBe('unhealthy');
      expect(apiCheck?.error).toBe('External API unavailable');
    });
  });
});