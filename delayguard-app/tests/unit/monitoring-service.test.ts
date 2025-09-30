import { MonitoringService } from '../../src/services/monitoring-service';
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

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get references to the mocked constructors
    const { Pool } = require('pg');
    const Redis = require('ioredis');
    
    // Create new instances with mocked methods
    mockDb = new Pool();
    mockRedis = new Redis();
    
    monitoringService = new MonitoringService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performHealthChecks', () => {
    it('should perform all health checks successfully', async () => {
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

    it('should detect unhealthy services', async () => {
      // Mock database failure
      mockDb.query.mockRejectedValue(new Error('Connection failed'));
      
      // Mock Redis failure
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));
      
      // Mock external API failures
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error')) // ShipEngine
        .mockRejectedValueOnce(new Error('Network error')) // SendGrid
        .mockRejectedValueOnce(new Error('Network error')); // Twilio

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(6);
      expect(checks.every(check => check.status === 'unhealthy')).toBe(true);
    });

    it('should detect degraded services', async () => {
      // Mock slow database response
      mockDb.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ rows: [{ health_check: 1 }] }), 2000))
      );
      
      // Mock Redis with slow response
      mockRedis.ping.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 200))
      );
      
      // Mock external APIs with slow responses
      global.fetch = jest.fn()
        .mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 200 }), 6000))
        );

      const checks = await monitoringService.performHealthChecks();

      expect(checks).toHaveLength(5);
      expect(checks.some(check => check.status === 'degraded')).toBe(true);
    });
  });

  describe('collectSystemMetrics', () => {
    it('should collect comprehensive system metrics', async () => {
      // Mock database stats
      mockDb.totalCount = 10;
      mockDb.idleCount = 8;
      mockDb.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      
      // Mock Redis stats
      mockRedis.info.mockResolvedValue('used_memory:1048576\nused_memory_peak:2097152');
      mockRedis.dbsize.mockResolvedValue(100);
      
      // Mock Redis get for metrics
      mockRedis.get.mockResolvedValue('45.0'); // responseTime

      const metrics = await monitoringService.collectSystemMetrics();

      expect(metrics).toMatchObject({
        timestamp: expect.any(Date),
        cpu: {
          usage: expect.any(Number),
          loadAverage: expect.any(Array)
        },
        memory: {
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        },
        database: {
          connections: {
            total: 10,
            idle: 8,
            active: 2
          },
          queryTime: expect.any(Number)
        },
        redis: {
          connected: true,
          memory: {
            used: expect.any(Number),
            peak: expect.any(Number)
          },
          operations: {
            commands: expect.any(Number),
            keyspace: 100
          }
        },
        application: {
          uptime: expect.any(Number),
          requests: {
            total: expect.any(Number),
            errors: expect.any(Number),
            successRate: expect.any(Number)
          },
          responseTime: {
            average: expect.any(Number),
            p95: expect.any(Number),
            p99: expect.any(Number)
          }
        }
      });
    });
  });

  describe('checkAlerts', () => {
    it('should check alert rules and generate alerts', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 900 * 1024 * 1024, // 900MB
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0
      })) as any;

      // Mock total memory
      const os = require('os');
      os.totalmem = jest.fn(() => 1000 * 1024 * 1024); // 1GB

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        ruleId: 'high_memory_usage',
        severity: 'high',
        message: expect.stringContaining('High Memory Usage'),
        value: expect.any(Number),
        threshold: 80,
        resolved: false
      });

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should not generate alerts when metrics are within thresholds', async () => {
      // Mock low memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 1000 * 1024 * 1024,
        external: 0,
        rss: 1000 * 1024 * 1024,
        arrayBuffers: 0
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
    it('should return overall system status', async () => {
      // Mock healthy checks
      mockDb.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockRedis.ping.mockResolvedValue('PONG');
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const status = await monitoringService.getSystemStatus();

      expect(status).toMatchObject({
        status: 'healthy',
        checks: expect.any(Array),
        metrics: expect.any(Object),
        alerts: expect.any(Array)
      });
    });

    it('should return degraded status when some checks fail', async () => {
      // Mock some healthy, some degraded checks
      mockDb.query.mockResolvedValue({ rows: [{ health_check: 1 }] });
      mockRedis.ping.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('PONG'), 200))
      );
      global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('degraded');
    });

    it('should return unhealthy status when critical checks fail', async () => {
      // Mock critical failures
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const status = await monitoringService.getSystemStatus();

      expect(status.status).toBe('unhealthy');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      const checks = await monitoringService.performHealthChecks();
      const dbCheck = checks.find(check => check.name === 'Database');

      expect(dbCheck?.status).toBe('unhealthy');
      expect(dbCheck?.error).toBe('Database error');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis error'));

      const checks = await monitoringService.performHealthChecks();
      const redisCheck = checks.find(check => check.name === 'Redis');

      expect(redisCheck?.status).toBe('unhealthy');
      expect(redisCheck?.error).toBe('Redis error');
    });

    it('should handle external API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'));

      const checks = await monitoringService.performHealthChecks();
      const apiChecks = checks.filter(check => 
        ['ShipEngine', 'SendGrid', 'Twilio'].includes(check.name)
      );

      expect(apiChecks.every(check => check.status === 'unhealthy')).toBe(true);
    });
  });
});
