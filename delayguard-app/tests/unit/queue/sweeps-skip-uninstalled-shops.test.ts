/**
 * Neither cron sweep may select an uninstalled shop.
 *
 * Until `app/uninstalled` landed there was no uninstall signal at all, so a
 * merchant who removed DelayGuard kept a live `shops` row — and both sweeps
 * kept pulling that shop's orders and emailing its customers for the 48 hours
 * until `shop/redact` arrived. The candidate query is the only place that can
 * stop it: the sweeps already JOIN `shops s`, so the fix is one predicate on
 * each, and this test is what keeps the predicate there.
 *
 * ⚠️ What this test can and cannot see. It asserts on the SQL the sweeps
 * EMIT, not on rows a database returned — the weaker of the two shapes in
 * tests.md. That is deliberate and measured, not laziness: pg-mem 3.0.14 (the
 * engine behind src/tests/helpers/pg-mem-schema.ts) cannot execute either
 * query. It rejects the correlated `LEFT JOIN LATERAL` both use to pick an
 * order's newest fulfillment ("column \"o.id\" does not exist") and, with that
 * removed, rejects `o.created_at > NOW() - INTERVAL '30 days'` ("cannot cast
 * type timestamptz to timestamp"). Both were reproduced directly against
 * pg-mem before this comment was written.
 *
 * The half this cannot reach — that a marked shop really does carry a
 * non-null `uninstalled_at`, and that reinstall really does clear it — runs
 * against the real production schema in
 * src/tests/integration/app-uninstall-lifecycle.test.ts.
 */
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
}));
jest.mock('../../../src/services/redis-connection', () => ({
  getRedisConnection: jest.fn(),
}));
jest.mock('../../../src/queue/processors/delay-check', () => ({
  processDelayCheck: jest.fn(),
}));
jest.mock('../../../src/queue/processors/notification', () => ({
  processNotification: jest.fn(),
}));
jest.mock('../../../src/queue/setup', () => ({
  delayCheckQueue: { drain: jest.fn().mockResolvedValue(undefined) },
  notificationQueue: { drain: jest.fn().mockResolvedValue(undefined) },
}));

import { query } from '../../../src/database/connection';
import { getRedisConnection } from '../../../src/services/redis-connection';
import { processDelayCheckSweep } from '../../../src/queue/sweeps/delay-check-sweep';
import { processNotificationSweep } from '../../../src/queue/sweeps/notification-sweep';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetRedis = getRedisConnection as jest.MockedFunction<
  typeof getRedisConnection
>;

/**
 * The predicate, anchored to the `shops` alias both queries already bind.
 * Anchoring to `s.` matters: a bare `uninstalled_at IS NULL` would be
 * ambiguous SQL against any future join that carries the same column.
 */
const SKIPS_UNINSTALLED_SHOPS = /AND\s+s\.uninstalled_at\s+IS\s+NULL/i;

async function sqlEmittedBy(sweep: () => Promise<unknown>): Promise<string> {
  mockQuery.mockResolvedValue([]);
  await sweep();

  const selects = mockQuery.mock.calls
    .map(([sql]) => sql)
    .filter((sql) => /FROM\s+(orders|delay_alerts)/i.test(sql));
  expect(selects).toHaveLength(1);
  return selects[0];
}

describe('cron sweeps skip uninstalled shops', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedis.mockResolvedValue({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    } as never);
  });

  it('delay-check sweep excludes them from its candidate orders', async() => {
    const sql = await sqlEmittedBy(processDelayCheckSweep);

    expect(sql).toMatch(/JOIN\s+shops\s+s\s+ON\s+s\.id\s*=\s*o\.shop_id/i);
    expect(sql).toMatch(SKIPS_UNINSTALLED_SHOPS);
  });

  it('notification sweep excludes them from its pending alerts', async() => {
    const sql = await sqlEmittedBy(processNotificationSweep);

    expect(sql).toMatch(/JOIN\s+shops\s+s\s+ON\s+s\.id\s*=\s*o\.shop_id/i);
    expect(sql).toMatch(SKIPS_UNINSTALLED_SHOPS);
  });
});
