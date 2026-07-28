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

    // checkExternalAPIs() calls the global fetch against real ShipEngine /
    // SendGrid / Twilio URLs. Unmocked, this suite made live network requests
    // and failed on CI runners (HEAD -> non-2xx or a throw => not 'healthy').
    // Unit tests must never depend on network weather.
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

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

    it('gives every external API request an abort signal so it cannot hang', async() => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock;

      await monitoringService.performHealthChecks();

      expect(fetchMock).toHaveBeenCalledTimes(3); // ShipEngine, SendGrid, Twilio
      for (const [, init] of fetchMock.mock.calls) {
        expect(init.signal).toBeInstanceOf(AbortSignal);
      }
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
    // LAUNCH_PLAN.md decision D2: internal alerts/alert_rules persistence is
    // cut from launch scope. checkAlerts must not read alert_rules from the
    // database nor INSERT INTO alerts — the tables are not in runMigrations().
    it('does not read alert_rules or persist alerts to the database (D2)', async() => {
      // Even with metrics collected there are no DB-backed rules to evaluate.
      await monitoringService.collectSystemMetrics();

      const alerts = await monitoringService.checkAlerts();

      expect(alerts).toEqual([]);
      const sqlCalls = (mockPoolInstance.query as jest.Mock).mock.calls.map(
        (call) => String(call[0]),
      );
      for (const sql of sqlCalls) {
        expect(sql).not.toMatch(/alert_rules/i);
        expect(sql).not.toMatch(/INSERT\s+INTO\s+alerts/i);
      }
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