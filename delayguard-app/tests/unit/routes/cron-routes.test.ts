/**
 * Cron route tests — LAUNCH_PLAN A4 + B1.
 *
 * Every /api/cron/* endpoint is guarded by the CRON_SECRET bearer check
 * (wrong/missing → 401, unset secret → 500) and accepts both GET (what
 * Vercel Cron sends) and POST (manual/external triggers). Sweep internals
 * are unit-tested in tests/unit/queue/*-sweep.test.ts; here they are
 * mocked to verify the route contract.
 */
import Koa from 'koa';
import Router from 'koa-router';
import request from 'supertest';

jest.mock('../../../src/queue/sweeps/delay-check-sweep', () => ({
  processDelayCheckSweep: jest.fn().mockResolvedValue({
    ordersChecked: 2,
    errors: 0,
  }),
}));
jest.mock('../../../src/queue/sweeps/notification-sweep', () => ({
  processNotificationSweep: jest.fn().mockResolvedValue({
    alertsProcessed: 1,
    errors: 0,
  }),
}));
jest.mock('../../../src/queue/sweeps/customer-sync-drain', () => ({
  processCustomerSyncDrain: jest.fn().mockResolvedValue({
    jobsProcessed: 3,
    errors: 0,
  }),
}));

import { queueSweepCronRoutes } from '../../../src/routes/queue-sweep-cron';
import { processDelayCheckSweep } from '../../../src/queue/sweeps/delay-check-sweep';
import { processNotificationSweep } from '../../../src/queue/sweeps/notification-sweep';
import { processCustomerSyncDrain } from '../../../src/queue/sweeps/customer-sync-drain';

const mockDelaySweep = processDelayCheckSweep as jest.MockedFunction<
  typeof processDelayCheckSweep
>;

function buildApp(): ReturnType<Koa['callback']> {
  const app = new Koa();
  const root = new Router();
  root.use('/api/cron', queueSweepCronRoutes.routes());
  app.use(root.routes());
  app.use(root.allowedMethods());
  return app.callback();
}

describe('queue-sweep cron routes (A4 auth + B1 endpoints)', () => {
  const SECRET = 'unit-test-cron-secret';

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    jest.clearAllMocks();
  });

  describe.each([
    '/api/cron/delay-check',
    '/api/cron/notification-dispatch',
    '/api/cron/customer-sync',
  ])('auth guard on %s', (path) => {
    it('missing Authorization header → 401', async() => {
      const res = await request(buildApp()).post(path);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('wrong secret → 401', async() => {
      const res = await request(buildApp())
        .post(path)
        .set('Authorization', 'Bearer nope');
      expect(res.status).toBe(401);
    });

    it('CRON_SECRET unset → 500 server configuration error', async() => {
      delete process.env.CRON_SECRET;
      const res = await request(buildApp())
        .post(path)
        .set('Authorization', 'Bearer whatever');
      expect(res.status).toBe(500);
    });
  });

  it('POST /api/cron/delay-check with correct secret → 200 + sweep stats', async() => {
    const res = await request(buildApp())
      .post('/api/cron/delay-check')
      .set('Authorization', `Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toEqual({ ordersChecked: 2, errors: 0 });
    expect(processDelayCheckSweep).toHaveBeenCalledTimes(1);
  });

  it('GET /api/cron/delay-check with correct secret → 200 (Vercel Cron uses GET)', async() => {
    const res = await request(buildApp())
      .get('/api/cron/delay-check')
      .set('Authorization', `Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/cron/notification-dispatch → 200 + stats', async() => {
    const res = await request(buildApp())
      .get('/api/cron/notification-dispatch')
      .set('Authorization', `Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({ alertsProcessed: 1, errors: 0 });
    expect(processNotificationSweep).toHaveBeenCalledTimes(1);
  });

  it('GET /api/cron/customer-sync → 200 + stats', async() => {
    const res = await request(buildApp())
      .get('/api/cron/customer-sync')
      .set('Authorization', `Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(res.body.stats).toEqual({ jobsProcessed: 3, errors: 0 });
    expect(processCustomerSyncDrain).toHaveBeenCalledTimes(1);
  });

  it('sweep failure → 500 with success: false', async() => {
    mockDelaySweep.mockRejectedValueOnce(new Error('sweep exploded'));

    const res = await request(buildApp())
      .post('/api/cron/delay-check')
      .set('Authorization', `Bearer ${SECRET}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
