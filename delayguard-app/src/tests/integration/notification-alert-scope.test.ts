/**
 * LAUNCH_PLAN §6 R17 — a notification must complete exactly ONE alert.
 *
 * These are the assertions the 2,446-test suite could not make. Every other
 * processor test mocks `database/connection`'s `query` and asserts that a
 * statement was *issued*; none of them can see how many rows it touched,
 * because `__mocks__/pg.js` answers every UPDATE with `rowCount: 1`.
 *
 * Here `pg` is a real SQL engine (pg-mem) carrying the real production schema
 * (built by running `runMigrations()` itself), so the assertions are about
 * database state after the fact rather than about statement text.
 *
 * Production evidence this reproduces (order 1, 2026-08-25): four alerts,
 * one email, `notification_sent_at` identical across all four to the
 * microsecond — every later delay on that order suppressed and recorded as
 * delivered.
 */
jest.mock('pg', () => require('../helpers/pg-mem-schema').createMemPg());

import { applyProductionSchema, selectRows, execSql } from '../helpers/pg-mem-schema';
import { processNotification } from '../../queue/processors/notification';
import { EmailService } from '../../services/email-service';
import { SMSService } from '../../services/sms-service';
import { billingService } from '../../services/billing-service';

jest.mock('../../services/email-service');
jest.mock('../../services/sms-service');
jest.mock('../../services/billing-service', () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue('pro'),
    isSmsAllowed: jest.fn().mockReturnValue(true),
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  // connection.ts (exercised for real here) uses the function-style exports.
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

const MockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
const MockSMSService = SMSService as jest.MockedClass<typeof SMSService>;
const mockGetCurrentPlan = billingService.getCurrentPlan as jest.Mock;

const ORDER_ID = 1;

interface AlertRow {
  id: number;
  delay_days: number;
  email_sent: boolean;
  sms_sent: boolean;
  notification_sent_at: Date | null;
}

function alerts(): AlertRow[] {
  return selectRows<AlertRow>(
    'SELECT id, delay_days, email_sent, sms_sent, notification_sent_at FROM delay_alerts ORDER BY id',
  );
}

/** Rebuild the production fixture: one order carrying four escalating delays. */
function seedFourAlertsOnOneOrder(): void {
  execSql('DELETE FROM delay_alerts');
  execSql('DELETE FROM orders');
  execSql('DELETE FROM app_settings');
  execSql('DELETE FROM shops');
  execSql(`INSERT INTO shops (id, shop_domain, access_token, scope, merchant_email, merchant_name)
           VALUES (1, 'delayguard-dev.myshopify.com', 'tok', ARRAY['write_orders'], 'merchant@delayguardapp.com', 'Dev Store')`);
  execSql(`INSERT INTO orders (id, shop_id, shopify_order_id, order_number, customer_name, customer_email, customer_phone, status, created_at)
           VALUES (1, 1, '9900112233', '#DG1001', 'Ada Lovelace', 'ada@example.com', '+15551230000', 'unfulfilled', '2026-07-30T23:14:46Z')`);
  execSql(`INSERT INTO app_settings (shop_id, email_enabled, sms_enabled)
           VALUES (1, TRUE, FALSE)`);
  // Four alerts, oldest first — mirroring the four real rows on order 1.
  // Ids are explicit: SERIAL does not rewind on DELETE, so leaving them to the
  // sequence would make the assertions below depend on test execution order.
  let day = 2;
  let id = 1;
  for (const created of ['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-23']) {
    execSql(`INSERT INTO delay_alerts (id, order_id, delay_days, delay_reason, created_at, email_sent, sms_sent)
             VALUES (${id}, 1, ${day}, 'WAREHOUSE_DELAY', '${created}T23:00:00Z', FALSE, FALSE)`);
    day += 7;
    id += 1;
  }
}

type NotificationJob = Parameters<typeof processNotification>[0];

function jobFor(alertId: number, delayDays: number): NotificationJob {
  return {
    id: `job-${alertId}`,
    data: {
      alertId,
      orderId: ORDER_ID,
      delayDetails: {
        estimatedDelivery: '',
        trackingNumber: '',
        trackingUrl: '',
        delayDays,
        delayReason: 'WAREHOUSE_DELAY',
      },
      delayType: 'WAREHOUSE_DELAY',
      merchantEmail: 'merchant@delayguardapp.com',
      merchantName: 'Dev Store',
      shopDomain: 'delayguard-dev.myshopify.com',
    },
  } as unknown as NotificationJob;
}

describe('processNotification — alert-level completion (§6 R17)', () => {
  const sendDelayEmail = jest.fn().mockResolvedValue(undefined);
  const sendDelaySMS = jest.fn().mockResolvedValue(undefined);

  beforeAll(async() => {
    process.env.SENDGRID_API_KEY = 'SG.test';
    process.env.TWILIO_ACCOUNT_SID = 'AC-test';
    process.env.TWILIO_AUTH_TOKEN = 'tw-test';
    process.env.TWILIO_PHONE_NUMBER = '+15550000000';
    await applyProductionSchema();
  });

  beforeEach(() => {
    sendDelayEmail.mockClear();
    sendDelaySMS.mockClear();
    MockEmailService.mockImplementation(
      () => ({ sendDelayEmail }) as unknown as EmailService,
    );
    MockSMSService.mockImplementation(
      () => ({ sendDelaySMS }) as unknown as SMSService,
    );
    seedFourAlertsOnOneOrder();
  });

  it('completes ONLY the alert it was given, leaving the other three pending', async() => {
    await processNotification(jobFor(2, 9));

    expect(sendDelayEmail).toHaveBeenCalledTimes(1);

    const rows = alerts();
    const completed = rows.filter(r => r.email_sent);
    expect(completed.map(r => r.id)).toEqual([2]);
    expect(rows.filter(r => !r.email_sent).map(r => r.id)).toEqual([1, 3, 4]);
  });

  it('stamps notification_sent_at on that alert alone', async() => {
    await processNotification(jobFor(2, 9));

    const stamped = alerts().filter(r => r.notification_sent_at !== null);
    expect(stamped.map(r => r.id)).toEqual([2]);
  });

  it('reads the sent-flags of the alert being processed, not the newest one', async() => {
    // The newest alert (id 4) is already delivered; alert 2 never was.
    // Reading "the newest alert for this order" concludes there is nothing to
    // do and silently drops a notification that was never attempted.
    execSql('UPDATE delay_alerts SET email_sent = TRUE WHERE id = 4');

    await processNotification(jobFor(2, 9));

    expect(sendDelayEmail).toHaveBeenCalledTimes(1);
    expect(alerts().filter(r => r.email_sent).map(r => r.id)).toEqual([2, 4]);
  });

  it('does not resend an alert that is already complete', async() => {
    execSql('UPDATE delay_alerts SET email_sent = TRUE WHERE id = 2');

    await processNotification(jobFor(2, 9));

    expect(sendDelayEmail).not.toHaveBeenCalled();
  });

  it('sends each of the four alerts exactly once when swept in sequence', async() => {
    for (const [alertId, delayDays] of [[1, 2], [2, 9], [3, 16], [4, 23]] as const) {
      await processNotification(jobFor(alertId, delayDays));
    }

    // The merchant's order slipped four times, so four emails are owed.
    expect(sendDelayEmail).toHaveBeenCalledTimes(4);
    expect(alerts().every(r => r.email_sent)).toBe(true);
  });
});

/**
 * §6 R19 — the processor's order SELECT never asks for the shop's domain.
 *
 * `orders` has no `shop_domain` column (verified against production), and the
 * statement selects `o.*` plus three named columns from `shops`, none of which
 * is `shop_domain`. So `order.shop_domain` is `undefined`, and the SMS plan
 * gate resolves the tier for a shop that does not exist. `getCurrentPlan`
 * fails closed to "free", so this suppresses SMS for every shop on every plan
 * rather than leaking it — a paid feature that cannot fire, not a billing
 * leak. Found while fixing R17: the real-schema run showed `shopDomain:
 * undefined` reaching EmailService.
 */
describe('processNotification — shop domain reaches the plan gate (§6 R19)', () => {
  const sendDelayEmail = jest.fn().mockResolvedValue(undefined);
  const sendDelaySMS = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    sendDelayEmail.mockClear();
    sendDelaySMS.mockClear();
    mockGetCurrentPlan.mockClear();
    mockGetCurrentPlan.mockResolvedValue('pro');
    (billingService.isSmsAllowed as jest.Mock).mockReturnValue(true);
    MockEmailService.mockImplementation(() => ({ sendDelayEmail }) as unknown as EmailService);
    MockSMSService.mockImplementation(() => ({ sendDelaySMS }) as unknown as SMSService);
    seedFourAlertsOnOneOrder();
    execSql('UPDATE app_settings SET sms_enabled = TRUE');
  });

  it('resolves the plan for the shop that owns the order, not for undefined', async() => {
    const job = jobFor(2, 9);
    (job.data as { customerPhone?: string }).customerPhone = '+15551230000';
    (job.data as { delayType?: string }).delayType = 'CARRIER_DELAY';

    await processNotification(job);

    expect(mockGetCurrentPlan).toHaveBeenCalledWith('delayguard-dev.myshopify.com');
  });

  it('passes the shop domain to the email recipient envelope', async() => {
    await processNotification(jobFor(2, 9));

    expect(sendDelayEmail).toHaveBeenCalledTimes(1);
    const orderInfo = sendDelayEmail.mock.calls[0][1] as { shopDomain?: string };
    expect(orderInfo.shopDomain).toBe('delayguard-dev.myshopify.com');
  });
});
