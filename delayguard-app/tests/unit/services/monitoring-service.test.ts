import { MonitoringService } from '../../../src/services/monitoring-service';
import { AppConfig } from '../../../src/types';

// Mock the dependencies
const mockRedisInstance = {
  ping: jest.fn().mockResolvedValue('PONG'),
  status: 'ready',
  setex: jest.fn().mockResolvedValue('OK'),
};

const mockPoolInstance = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPoolInstance),
}));

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockConfig: AppConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      database: {
        url: 'postgresql://test:test@localhost:5432/test',
      },
      redis: {
        url: 'redis://localhost:6379',
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

    // Reset mocks before each test
    mockRedisInstance.ping = jest.fn().mockResolvedValue('PONG');
    mockPoolInstance.query = jest.fn().mockResolvedValue({ rows: [] });

    monitoringService = new MonitoringService(mockConfig);
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async() => {
      const healthChecks = await monitoringService.performHealthChecks();

      expect(healthChecks).toHaveLength(6); // database, redis, 3 external APIs, application
      expect(healthChecks.every(check => check.status === 'healthy')).toBe(true);
    });

    it('should detect unhealthy services', async() => {
      // Mock Redis connection failure
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Connection failed');
    });

    it('should detect degraded services', async() => {
      // Mock slow database response
      mockPoolInstance.query = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [] }), 2000)),
      );

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('degraded');
      expect(dbCheck?.responseTime).toBeGreaterThan(1000);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async() => {
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
    it('should check alert rules and generate alerts', async() => {
      // Mock alert rules in database
      mockPoolInstance.query = jest.fn().mockResolvedValue({
        rows: [{
          id: 'high_memory_usage',
          name: 'High Memory Usage',
          metric: 'memory.percentage',
          operator: 'gt',
          threshold: 80,
          duration: 60,
          severity: 'high',
          enabled: true,
          channels: ['email', 'sms'],
        }],
      });

      // Mock high memory usage - heapUsed should be > 80% of total memory
      const originalProcess = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 100, // 100MB
        heapTotal: 1024 * 1024 * 50,
        heapUsed: 1024 * 1024 * 45, // 45MB heap used
        external: 1024 * 1024 * 10,
        arrayBuffers: 1024 * 1024 * 5,
      }) as any;

      // Mock os.totalmem to return a smaller value to trigger high memory alert
      const originalOs = require('os');
      jest.doMock('os', () => ({
        ...originalOs,
        totalmem: () => 1024 * 1024 * 50, // 50MB total memory (45/50 = 90% > 80%)
      }));

      // Add some metrics to trigger the alert
      await monitoringService.collectSystemMetrics();

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'high_memory_usage',
        severity: 'high',
        message: expect.stringContaining('High Memory Usage'),
      });

      // Restore original function
      process.memoryUsage = originalProcess;
    });

    it('should not generate alerts when metrics are within thresholds', async() => {
      // Mock normal memory usage
      const originalProcess = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 1024 * 1024 * 10, // 10MB
        heapTotal: 1024 * 1024 * 5,
        heapUsed: 1024 * 1024 * 3,
        external: 1024 * 1024 * 2,
        arrayBuffers: 1024 * 1024 * 1,
      }) as any;

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);

      // Restore original function
      process.memoryUsage = originalProcess;
    });
  });

  describe('getSystemStatus', () => {
    it('should return overall system status', async() => {
      const status = await monitoringService.getSystemStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('checks');
      expect(status.status).toMatch(/healthy|degraded|unhealthy/);
      expect(Array.isArray(status.checks)).toBe(true);
    });

    it('should return degraded status when some checks fail', async() => {
      // Mock one service failure
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Redis unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy'); // Redis failure should make it unhealthy, not degraded
    });

    it('should return unhealthy status when critical checks fail', async() => {
      // Mock database failure
      mockPoolInstance.query = jest.fn().mockRejectedValue(new Error('Database unavailable'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async() => {
      mockPoolInstance.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const dbCheck = healthChecks.find(check => check.name === 'Database');
      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database connection failed');
    });

    it('should handle Redis errors gracefully', async() => {
      mockRedisInstance.ping = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const healthChecks = await monitoringService.performHealthChecks();

      const redisCheck = healthChecks.find(check => check.name === 'Redis');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis connection failed');
    });

    it('should handle external API errors gracefully', async() => {
      // Mock fetch to simulate external API failure
      global.fetch = jest.fn().mockRejectedValue(new Error('External API unavailable'));

      const healthChecks = await monitoringService.performHealthChecks();

      const apiChecks = healthChecks.filter(check => check.name === 'ShipEngine' || check.name === 'SendGrid' || check.name === 'Twilio');
      expect(apiChecks.length).toBeGreaterThan(0);
      expect(apiChecks.some(check => check.status === 'unhealthy')).toBe(true);
    });
  });
});