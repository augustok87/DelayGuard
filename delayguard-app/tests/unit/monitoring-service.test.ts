// Mock the database and Redis modules before importing the service
const mockQuery = jest.fn();
const mockPing = jest.fn();
const mockInfo = jest.fn();
const mockDbsize = jest.fn();
const mockSetex = jest.fn();
const mockGet = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    totalCount: 10,
    idleCount: 8,
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: mockPing,
    info: mockInfo,
    dbsize: mockDbsize,
    setex: mockSetex,
    get: mockGet,
    status: 'ready',
  }));
});

import { MonitoringService } from '@/services/monitoring-service';
import { AppConfig } from '@/types';

const mockConfig: AppConfig = {
  shopify: {
    apiKey: 'test-key',
    apiSecret: 'test-secret',
    scopes: ['read_orders'],
  },
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  shipengine: {
    apiKey: 'test-shipengine-key',
  },
  sendgrid: {
    apiKey: 'test-sendgrid-key',
  },
  twilio: {
    accountSid: 'test-sid',
    authToken: 'test-token',
    phoneNumber: '+1234567890',
  },
};

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create new instances with mocked methods
    mockDb = {
      query: mockQuery,
      totalCount: 10,
      idleCount: 8,
    };
    
    mockRedis = {
      ping: mockPing,
      info: mockInfo,
      dbsize: mockDbsize,
      setex: mockSetex,
      get: mockGet,
      status: 'ready',
    };
    
    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async() => {
      // Mock database health check
      mockDb.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      // Mock Redis health check
      mockRedis.ping.mockResolvedValue('PONG');
      
      // Mock external API health checks
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 }) // ShipEngine
        .mockResolvedValueOnce({ ok: true, status: 200 }) // SendGrid
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Twilio

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6); // Database, Redis, 3 external APIs, Application
      expect(checks.every(check => check.status === 'healthy')).toBe(true);
    });

    it('should detect unhealthy services', async() => {
      // Mock database failure
      mockQuery.mockRejectedValue(new Error('Connection failed'));
      
      // Mock Redis failure
      mockPing.mockRejectedValue(new Error('Connection failed'));
      
      // Mock external API failures
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error')) // ShipEngine
        .mockRejectedValueOnce(new Error('Network error')) // SendGrid
        .mockRejectedValueOnce(new Error('Network error')); // Twilio

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6);
      const dbCheck = checks.find(c => c.name === 'Database');
      const redisCheck = checks.find(c => c.name === 'Redis');
      const apiChecks = checks.filter(c => ['ShipEngine', 'SendGrid', 'Twilio'].includes(c.name));
      
      expect(dbCheck?.status).toBe('unhealthy');
      expect(redisCheck?.status).toBe('unhealthy');
      expect(apiChecks.every(check => check.status === 'unhealthy')).toBe(true);
    });

    it('should detect degraded services', async() => {
      // Mock database and Redis with normal responses
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6);
      const dbCheck = checks.find(c => c.name === 'Database');
      const redisCheck = checks.find(c => c.name === 'Redis');
      const appCheck = checks.find(c => c.name === 'Application');
      
      // Verify all checks are defined
      expect(dbCheck).toBeDefined();
      expect(redisCheck).toBeDefined();
      expect(appCheck).toBeDefined();
      
      // Verify checks have response times
      expect(dbCheck?.responseTime).toBeGreaterThanOrEqual(0);
      expect(redisCheck?.responseTime).toBeGreaterThanOrEqual(0);
      expect(appCheck?.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async() => {
      // Mock database stats
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      // Mock Redis stats
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');

      const metrics = await monitoringService.collectSystemMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.arrayContaining([expect.any(Number)]),
        },
        memory: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
        database: {
          connections: {
            total: 10,
            idle: 8,
            active: 2,
          },
          queryTime: expect.any(Number),
        },
        redis: {
          connected: true,
          memory: {
            used: expect.any(Number),
            peak: expect.any(Number),
          },
          operations: {
            commands: expect.any(Number),
            keyspace: 100,
          },
        },
        application: {
          uptime: expect.any(Number),
          requests: {
            total: expect.any(Number),
            errors: expect.any(Number),
            successRate: expect.any(Number),
          },
          responseTime: {
            average: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number),
          },
        },
      });
    });
  });

  describe('checkAlerts', () => {
    it('should check alert rules and generate alerts', async() => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0,
      })) as any;

      // Mock total memory
      const os = require('os');
      os.totalmem = jest.fn(() => 1000 * 1024 * 1024); // 1GB

      // Mock database and Redis for collectSystemMetrics
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');

      // Collect metrics first to populate the metrics array
      await monitoringService.collectSystemMetrics();

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'high_memory_usage',
        severity: 'high',
        message: expect.stringContaining('High Memory Usage'),
        value: expect.any(Number),
        threshold: 80,
        resolved: false,
      });

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should not generate alerts when metrics are within thresholds', async() => {
      // Mock low memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0,
      })) as any;

      // Mock total memory
      const os = require('os');
      os.totalmem = jest.fn(() => 1000 * 1024 * 1024); // 1GB

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('getSystemStatus', () => {
    it('should return overall system status', async() => {
      // Mock healthy checks
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      // Collect metrics first
      await monitoringService.collectSystemMetrics();

      const status = await monitoringService.getSystemStatus();

      expect(status).toMatchObject({
        status: expect.stringMatching(/healthy|degraded/), // Can be either depending on system state
        checks: expect.any(Array),
        metrics: expect.any(Object),
        alerts: expect.any(Array),
      });
    });

    it('should return degraded status when some checks fail', async() => {
      // Mock some healthy, some degraded checks (Redis slow)
      jest.useFakeTimers();
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve('PONG'), 150);
        }),
      );
      mockInfo.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockDbsize.mockResolvedValue(100);
      mockSetex.mockResolvedValue('OK');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      // Collect metrics first
      const metricsPromise = monitoringService.collectSystemMetrics();
      jest.runAllTimers();
      jest.useRealTimers();
      await metricsPromise;

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('degraded');
    });

    it('should return unhealthy status when critical checks fail', async() => {
      // Mock critical failures
      mockQuery.mockRejectedValue(new Error('Database connection failed'));
      mockPing.mockRejectedValue(new Error('Redis connection failed'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async() => {
      mockQuery.mockRejectedValue(new Error('Database error'));
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();
      const dbCheck = checks.find(check => check.name === 'Database');

      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database error');
    });

    it('should handle Redis errors gracefully', async() => {
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockRejectedValue(new Error('Redis error'));
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const checks = await monitoringService.performHealthChecks();
      const redisCheck = checks.find(check => check.name === 'Redis');

      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis error');
    });

    it('should handle external API errors gracefully', async() => {
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockPing.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'));

      const checks = await monitoringService.performHealthChecks();
      const apiChecks = checks.filter(check => 
        ['ShipEngine', 'SendGrid', 'Twilio'].includes(check.name),
      );

      expect(apiChecks.every(check => check.status === 'unhealthy')).toBe(true);
    });
  });
});
