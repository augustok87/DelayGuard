/**
 * LAUNCH_PLAN §6 R24 — /monitoring/health must not be permanently 503.
 *
 * The route mapped anything other than all-healthy to 503. That was harmless
 * only while every dependency was healthy; the moment the carrier API became
 * deliberately unconfigured — which is now the steady state until an EasyPost
 * key exists — the endpoint went permanently red while the database, Redis,
 * SendGrid, Twilio and the application itself were all fine.
 *
 * Observed in production 2026-09-16: body `"status": "degraded"` with a single
 * degraded check, served as HTTP 503.
 *
 * A permanently-red check and a check that can never fail are the same bug
 * (CLAUDE.md, R21). 503 means "service unavailable" and must be reserved for
 * a dependency that is actually down, matching what /health already does.
 */
import request from 'supertest';
import Koa from 'koa';
import { MonitoringService } from '../../../services/monitoring-service';

jest.mock('../../../services/monitoring-service');
jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const check = (name: string, status: 'healthy' | 'degraded' | 'unhealthy') => ({
  name,
  status,
  responseTime: 1,
  lastChecked: new Date(),
});

const mountRoute = () => {
  // Required after the mock so the route picks up the mocked service.
  const { monitoringRoutes } = require('../../../routes/monitoring');
  const app = new Koa();
  app.use(monitoringRoutes.routes()).use(monitoringRoutes.allowedMethods());
  return app.callback();
};

describe('GET /monitoring/health — HTTP status mapping', () => {
  const mockPerformHealthChecks =
    MonitoringService.prototype.performHealthChecks as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when every dependency is healthy', async() => {
    mockPerformHealthChecks.mockResolvedValue([
      check('Database', 'healthy'),
      check('Redis', 'healthy'),
    ]);

    const response = await request(mountRoute()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  it('returns 200 when a dependency is merely degraded', async() => {
    mockPerformHealthChecks.mockResolvedValue([
      check('Database', 'healthy'),
      check('EasyPost', 'degraded'),
    ]);

    const response = await request(mountRoute()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('degraded');
  });

  // The other half of the contract: 503 must still mean something.
  it('returns 503 when a dependency is actually unhealthy', async() => {
    mockPerformHealthChecks.mockResolvedValue([
      check('Database', 'unhealthy'),
      check('Redis', 'healthy'),
    ]);

    const response = await request(mountRoute()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });

  it('reports unhealthy over degraded when both are present', async() => {
    mockPerformHealthChecks.mockResolvedValue([
      check('EasyPost', 'degraded'),
      check('Database', 'unhealthy'),
    ]);

    const response = await request(mountRoute()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
  });
});
