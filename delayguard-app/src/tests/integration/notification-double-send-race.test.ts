/**
 * Pre-launch adversarial review — the check-then-send race on `delay_alerts`.
 *
 * `queue/sweeps/notification-sweep.ts` carries this claim in its header:
 *
 *   "processNotification re-checks email_sent/sms_sent itself — for the
 *    specific alert named by alertId — so overlapping cron ticks cannot
 *    double-send."
 *
 * That is false, and it is load-bearing: it is the stated reason no atomic
 * claim was ever added. The processor SELECTs `email_sent`, awaits the
 * provider send, and only then UPDATEs the flag. Two dispatches that overlap
 * anywhere inside that window both read FALSE and both send — the flag is a
 * record of what finished, never a lock on what started.
 *
 * `__mocks__/pg.js` cannot see this: it answers every UPDATE with
 * `rowCount: 1` without reading the WHERE clause, so a claim that lost the
 * race is indistinguishable from one that won. These tests run the
 * production `runMigrations()` against pg-mem, a real SQL engine, so the
 * assertion is about how many sends actually left the building.
 *
 * Trigger in production: `/api/cron/notification-dispatch` is a plain
 * bearer-guarded GET **and** POST with no lock, no lease and no advisory
 * lock. The GitHub Actions schedule, its `--retry 2`, a `workflow_dispatch`
 * run and any manual curl are four independent ways to have two sweeps in
 * flight at once. Each duplicate is a real email to a real customer.
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { processNotification } from '../../queue/processors/notification';
import { EmailService } from '../../services/email-service';
import { SMSService } from '../../services/sms-service';

jest.mock('../../services/email-service');
jest.mock('../../services/sms-service');
jest.mock('../../services/billing-service', () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue('free'),
    isSmsAllowed: jest.fn().mockReturnValue(false),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const MockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
const MockSMSService = SMSService as jest.MockedClass<typeof SMSService>;

const ORDER_ID = 1;
const ALERT_ID = 1;

interface AlertRow {
  id: number;
  email_sent: boolean;
  notification_sent_at: Date | null;
}

function alerts(): AlertRow[] {
  return selectRows<AlertRow>(
    'SELECT id, email_sent, notification_sent_at FROM delay_alerts ORDER BY id',
  );
}

/** One shop, one order, one pending alert — the smallest state that can race. */
function seedOnePendingAlert(): void {
  execSql('DELETE FROM delay_alerts');
  execSql('DELETE FROM orders');
  execSql('DELETE FROM app_settings');
  execSql('DELETE FROM shops');
  execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
           VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['read_orders'], 'merchant@delayguardapp.com', 'Dev Store')`);
  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, status, created_at)
           VALUES (1, 1, '9900112233', '#DG1001', 'Ada Lovelace', 'ada@example.com', 'unfulfilled', '2026-09-20T10:00:00Z')`);
  execSql(`INSERT INTO app_settings (shop_id, email_enabled, sms_enabled)
           VALUES (1, TRUE, FALSE)`);
  execSql(`INSERT INTO delay_alerts (id, order_id, delay_days, delay_reason, created_at, email_sent, sms_sent)
           VALUES (${ALERT_ID}, 1, 3, 'WAREHOUSE_DELAY', '2026-09-21T10:00:00Z', FALSE, FALSE)`);
}

type NotificationJob = Parameters<typeof processNotification>[0];

/**
 * Let real pending work run. Counting microtask ticks is not enough: the
 * processor awaits several pg-mem round-trips before it reaches the provider,
 * and a test that guesses the tick count fails by timing out instead of by
 * asserting — which says nothing about the bug.
 */
function flush(ms = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Resolve once `predicate` holds, or throw saying what never happened. */
async function waitUntil(
  predicate: () => boolean,
  description: string,
  timeoutMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for: ${description}`);
    }
    await flush(5);
  }
}

function jobFor(alertId: number): NotificationJob {
  return {
    id: `job-${alertId}`,
    data: {
      alertId,
      orderId: ORDER_ID,
      delayDetails: {
        estimatedDelivery: '',
        trackingNumber: '',
        trackingUrl: '',
        delayDays: 3,
        delayReason: 'WAREHOUSE_DELAY',
      },
      delayType: 'WAREHOUSE_DELAY',
      merchantEmail: 'merchant@delayguardapp.com',
      merchantName: 'Dev Store',
      shopDomain: 'delayguard-dev.myshopify.com',
    },
  } as unknown as NotificationJob;
}

describe('processNotification — concurrent dispatch of one alert', () => {
  /**
   * A send that does not resolve instantly. Every real provider call has this
   * shape; with an instantaneous mock the two dispatches would never overlap
   * and the test would pass against the broken code — a check that cannot
   * fail.
   */
  let pendingSends: (() => void)[] = [];
  const releaseSend = (): void => {
    // Every parked send is released. Keeping only the latest resolver would
    // hang dispatch A the moment B also reached the provider — i.e. exactly
    // when the bug reproduces.
    for (const resolve of pendingSends.splice(0)) resolve();
  };
  const sendDelayEmail = jest.fn(
    () => new Promise<void>(resolve => {
      pendingSends.push(resolve);
    }),
  );
  const sendDelaySMS = jest.fn().mockResolvedValue(undefined);

  beforeAll(async() => {
    process.env.SENDGRID_API_KEY = 'SG.test';
    process.env.TWILIO_ACCOUNT_SID = 'AC-test';
    process.env.TWILIO_AUTH_TOKEN = 'tw-test';
    process.env.TWILIO_PHONE_NUMBER = '+15550000000';
    await applyProductionSchema();
  });

  beforeEach(() => {
    pendingSends = [];
    sendDelayEmail.mockClear();
    sendDelaySMS.mockClear();
    MockEmailService.mockImplementation(
      () => ({ sendDelayEmail }) as unknown as EmailService,
    );
    MockSMSService.mockImplementation(
      () => ({ sendDelaySMS }) as unknown as SMSService,
    );
    seedOnePendingAlert();
  });

  it('sends the customer ONE email when two dispatches overlap', async() => {
    // Dispatch A runs until it is parked inside the provider call — the exact
    // window the sweep header claims is safe.
    const first = processNotification(jobFor(ALERT_ID));
    await waitUntil(
      () => sendDelayEmail.mock.calls.length >= 1,
      'dispatch A to reach the email provider',
    );

    // Dispatch B arrives while A is still in flight and email_sent is FALSE.
    const second = processNotification(jobFor(ALERT_ID));
    await flush(100);

    releaseSend();
    await Promise.all([first, second]);

    expect(sendDelayEmail).toHaveBeenCalledTimes(1);
  });

  // Passes in both states by design (tests.md): it pins the OTHER half of the
  // contract — the claim must not lose the write, duplicate the row, or leave
  // the delivery badge unstamped. It guards the over-correction, not the bug.
  it('leaves exactly one alert row marked sent, stamped once', async() => {
    const first = processNotification(jobFor(ALERT_ID));
    await waitUntil(
      () => sendDelayEmail.mock.calls.length >= 1,
      'dispatch A to reach the email provider',
    );
    const second = processNotification(jobFor(ALERT_ID));
    await flush(100);

    releaseSend();
    await Promise.all([first, second]);

    const rows = alerts();
    expect(rows).toHaveLength(1);
    expect(rows[0].email_sent).toBe(true);
    expect(rows[0].notification_sent_at).not.toBeNull();
  });

  // Also green before the fix, and deliberately kept (tests.md): a claim that
  // is too aggressive would suppress the ONLY dispatch, which is a worse bug
  // than the one being fixed. This is the assertion that would catch it.
  it('still sends when only one dispatch runs (the claim must not block the happy path)', async() => {
    const only = processNotification(jobFor(ALERT_ID));
    await waitUntil(
      () => sendDelayEmail.mock.calls.length >= 1,
      'the single dispatch to reach the email provider',
    );
    releaseSend();
    await only;

    expect(sendDelayEmail).toHaveBeenCalledTimes(1);
    expect(alerts()[0].email_sent).toBe(true);
  });
});
