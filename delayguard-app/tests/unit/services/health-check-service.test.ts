/**
 * HealthCheckService tests — LAUNCH_PLAN A1.
 *
 * The /health endpoint must be HONEST: it really pings Postgres and Redis
 * and reports measured latencies or the failure. Status mapping:
 *   - database unhealthy → overall "unhealthy" (app cannot function)
 *   - redis unhealthy    → overall "degraded" (queues/cursors degraded)
 *   - both healthy       → "healthy"
 */
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
}));
jest.mock('../../../src/services/redis-connection', () => ({
  getRedisConnection: jest.fn(),
}));

import { query } from '../../../src/database/connection';
import { getRedisConnection } from '../../../src/services/redis-connection';
import { HealthCheckService } from '../../../src/services/health-check-service';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetRedis = getRedisConnection as jest.MockedFunction<
  typeof getRedisConnection
>;

describe('HealthCheckService', () => {
  let service: HealthCheckService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HealthCheckService();
  });

  it('reports healthy with measured latencies when both pings succeed', async() => {
    mockQuery.mockResolvedValue([]);
    mockGetRedis.mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    } as never);

    const report = await service.check();

    expect(report.status).toBe('healthy');
    expect(report.services.database.status).toBe('healthy');
    expect(typeof report.services.database.responseTimeMs).toBe('number');
    expect(report.services.redis.status).toBe('healthy');
    expect(typeof report.services.redis.responseTimeMs).toBe('number');
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
    expect(report.timestamp).toBeDefined();
  });

  it('reports unhealthy (not a fake healthy) when the database ping fails', async() => {
    mockQuery.mockRejectedValue(new Error('Database not initialized'));
    mockGetRedis.mockResolvedValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    } as never);

    const report = await service.check();

    expect(report.status).toBe('unhealthy');
    expect(report.services.database.status).toBe('unhealthy');
    expect(report.services.database.responseTimeMs).toBeNull();
    expect(report.services.database.error).toContain('Database not initialized');
    expect(report.services.redis.status).toBe('healthy');
  });

  it('reports degraded when only Redis fails', async() => {
    mockQuery.mockResolvedValue([]);
    mockGetRedis.mockRejectedValue(new Error('ECONNREFUSED'));

    const report = await service.check();

    expect(report.status).toBe('degraded');
    expect(report.services.redis.status).toBe('unhealthy');
    expect(report.services.redis.error).toContain('ECONNREFUSED');
    expect(report.services.database.status).toBe('healthy');
  });

  it('reports unhealthy when a Redis ping returns a non-PONG payload', async() => {
    mockQuery.mockResolvedValue([]);
    mockGetRedis.mockResolvedValue({
      ping: jest.fn().mockResolvedValue('NOPE'),
    } as never);

    const report = await service.check();

    expect(report.services.redis.status).toBe('unhealthy');
    expect(report.status).toBe('degraded');
  });
});
