/**
 * BullMQ notification processor — Wave 4.1 sibling test.
 *
 * Closes the v1.19 routing-rule gap for the customer-notification dispatch path:
 *   - Settings-flag combinations (email_enabled × sms_enabled × already-sent)
 *   - Per-channel recipient gates (customer_email / customer_phone)
 *   - BullMQ retry semantics (failure must propagate so attempts: 3 fires)
 *
 * Mocking convention (per .claude/rules/tests.md):
 *   EmailService and SMSService are mocked at the class level — the processor
 *   test isolates to its own dispatch logic and does NOT reach into vendor SDKs.
 *   (Vendor-SDK-level mocking is covered in email-service.test.ts / sms-service.test.ts.)
 */

import { Job } from 'bullmq';
import { processNotification } from '../../../queue/processors/notification';
import { query } from '../../../database/connection';
import { EmailService } from '../../../services/email-service';
import { SMSService } from '../../../services/sms-service';
import { billingService } from '../../../services/billing-service';

jest.mock('../../../database/connection');
jest.mock('../../../services/email-service');
jest.mock('../../../services/sms-service');
// SMS is a paid feature — the processor plan-gates dispatch. Default the mock
// to "allowed" so the existing SMS-positive tests keep exercising dispatch;
// the plan-gate describe block below overrides per-test.
jest.mock('../../../services/billing-service', () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue('pro'),
    isSmsAllowed: jest.fn().mockReturnValue(true),
  },
}));
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const MockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
const MockSMSService = SMSService as jest.MockedClass<typeof SMSService>;
const mockGetCurrentPlan = billingService.getCurrentPlan as jest.Mock;
const mockIsSmsAllowed = billingService.isSmsAllowed as jest.Mock;

// clearAllMocks() (called in each describe's beforeEach) wipes the factory
// defaults, so restore "SMS allowed" before every test unless overridden.
function allowSmsByDefault(): void {
  mockGetCurrentPlan.mockResolvedValue('pro');
  mockIsSmsAllowed.mockReturnValue(true);
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  tracking_number: string;
  carrier_code: string;
  shopify_order_id: string;
  shop_domain: string;
  created_at: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  // Launch WS-E (E3): merchant contact columns from the shops JOIN
  merchant_email: string | null;
  merchant_phone: string | null;
  merchant_name: string | null;
}

interface AlertRow {
  /** §6 R17: completion is keyed on the alert's own id, not the order's. */
  id: number;
  email_sent: boolean;
  sms_sent: boolean;
}

function makeOrderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: '101',
    order_number: '1001',
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    customer_phone: '+15558675309',
    tracking_number: '1Z999AA1234567890',
    carrier_code: 'ups',
    shopify_order_id: 'gid://shopify/Order/101',
    shop_domain: 'test-shop.myshopify.com',
    created_at: '2026-05-01T00:00:00.000Z',
    email_enabled: true,
    sms_enabled: true,
    merchant_email: null,
    merchant_phone: null,
    merchant_name: null,
    ...overrides,
  };
}

const ALERT_ID = 55;

function makeAlertRow(overrides: Partial<AlertRow> = {}): AlertRow {
  return { id: ALERT_ID, email_sent: false, sms_sent: false, ...overrides };
}

interface NotificationPayload {
  alertId?: number;
  orderId: number;
  delayDetails: {
    estimatedDelivery: string;
    trackingNumber: string;
    trackingUrl: string;
    delayDays: number;
    delayReason: string;
  };
  shopDomain: string;
  // Launch WS-E (E3): routing fields — delayType decides merchant vs customer
  delayType?: 'WAREHOUSE_DELAY' | 'CARRIER_DELAY' | 'TRANSIT_DELAY';
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantName?: string | null;
  customerEmail?: string;
  customerPhone?: string;
}

const CANONICAL_TRACKING_URL =
  'https://www.ups.com/track?tracknum=1Z999AA1234567890';

function makeJob(
  overrides: Partial<NotificationPayload> = {},
): Job<NotificationPayload> {
  return {
    data: {
      alertId: ALERT_ID,
      orderId: 101,
      delayDetails: {
        estimatedDelivery: '2026-05-12',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: CANONICAL_TRACKING_URL,
        delayDays: 3,
        delayReason: 'Weather delay',
      },
      shopDomain: 'test-shop.myshopify.com',
      ...overrides,
    },
  } as unknown as Job<NotificationPayload>;
}

/**
 * Wire mockQuery to respond in the order the processor calls:
 *   1. SELECT order + shop          → [orderRow]
 *   2. SELECT delay_alerts          → [alertRow]
 *   3+. UPDATE delay_alerts ...     → []  (per channel actually fired)
 */
function wireQuery(orderRow: OrderRow | null, alertRow: AlertRow | null): void {
  mockQuery.mockReset();
  mockQuery.mockImplementation(async(sql: string) => {
    if (sql.includes('FROM orders')) {
      return orderRow ? [orderRow] : [];
    }
    if (sql.includes('FROM delay_alerts')) {
      return alertRow ? [alertRow] : [];
    }
    if (sql.startsWith('UPDATE delay_alerts')) {
      return [];
    }
    return [];
  });
}

describe('processNotification — settings-flag routing (v1.19 rule)', () => {
  let emailSendMock: jest.Mock;
  let smsSendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    allowSmsByDefault();
    emailSendMock = jest.fn().mockResolvedValue(undefined);
    smsSendMock = jest.fn().mockResolvedValue(undefined);

    MockEmailService.mockImplementation(
      () =>
        ({ sendDelayEmail: emailSendMock } as unknown as EmailService),
    );
    MockSMSService.mockImplementation(
      () =>
        ({ sendDelaySMS: smsSendMock } as unknown as SMSService),
    );
  });

  it('email-only branch: email_enabled=true, sms_enabled=false → exactly one email, zero SMS', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(smsSendMock).toHaveBeenCalledTimes(0);
  });

  it('SMS-only branch: email_enabled=false, sms_enabled=true → exactly one SMS, zero emails', async() => {
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(smsSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock).toHaveBeenCalledTimes(0);
  });

  it('both branches: email_enabled=true, sms_enabled=true → exactly one email AND one SMS (NOT two of each — v1.19 double-dispatch regression guard)', async() => {
    wireQuery(makeOrderRow(), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(smsSendMock).toHaveBeenCalledTimes(1);
  });

  it('neither branch: email_enabled=false, sms_enabled=false → zero of each (the bug-shaped silent-skip test)', async() => {
    wireQuery(
      makeOrderRow({ email_enabled: false, sms_enabled: false }),
      makeAlertRow(),
    );

    await processNotification(makeJob());

    expect(emailSendMock).not.toHaveBeenCalled();
    expect(smsSendMock).not.toHaveBeenCalled();
  });

  it('per-recipient guard: email_enabled=true but customer_email is empty → no email fires (the per-channel recipient gate)', async() => {
    wireQuery(makeOrderRow({ customer_email: '' }), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it('per-recipient guard: sms_enabled=true but customer_phone is empty → no SMS fires', async() => {
    wireQuery(
      makeOrderRow({ customer_phone: '', email_enabled: false }),
      makeAlertRow(),
    );

    await processNotification(makeJob());

    expect(smsSendMock).not.toHaveBeenCalled();
  });

  it('already-sent gate: email_sent=true → skip email dispatch even if email_enabled=true', async() => {
    wireQuery(
      makeOrderRow({ sms_enabled: false }),
      makeAlertRow({ email_sent: true }),
    );

    await processNotification(makeJob());

    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it('already-sent gate: sms_sent=true → skip SMS dispatch even if sms_enabled=true', async() => {
    wireQuery(
      makeOrderRow({ email_enabled: false }),
      makeAlertRow({ sms_sent: true }),
    );

    await processNotification(makeJob());

    expect(smsSendMock).not.toHaveBeenCalled();
  });
});

describe('processNotification — error propagation (BullMQ retry surface)', () => {
  let emailSendMock: jest.Mock;
  let smsSendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    allowSmsByDefault();
    emailSendMock = jest.fn().mockResolvedValue(undefined);
    smsSendMock = jest.fn().mockResolvedValue(undefined);

    MockEmailService.mockImplementation(
      () =>
        ({ sendDelayEmail: emailSendMock } as unknown as EmailService),
    );
    MockSMSService.mockImplementation(
      () =>
        ({ sendDelaySMS: smsSendMock } as unknown as SMSService),
    );
  });

  it('re-throws when the order is not found (BullMQ retry must see the failure)', async() => {
    wireQuery(null, null);

    await expect(processNotification(makeJob())).rejects.toThrow(
      /Order 101 not found/,
    );
  });

  it('re-throws naming the missing alert when the job identifies one (§6 R17)', async() => {
    wireQuery(makeOrderRow(), null);

    await expect(processNotification(makeJob())).rejects.toThrow(
      /Delay alert 55 not found/,
    );
  });

  it('re-throws for the order when a legacy payload carries no alertId', async() => {
    wireQuery(makeOrderRow(), null);

    await expect(
      processNotification(makeJob({ alertId: undefined })),
    ).rejects.toThrow(/No delay alert found for order 101/);
  });

  it('re-throws when email dispatch fails (must propagate so BullMQ retries)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());
    emailSendMock.mockRejectedValue(new Error('SendGrid 503: temporarily unavailable'));

    await expect(processNotification(makeJob())).rejects.toThrow(
      /SendGrid 503/,
    );
  });

  it('re-throws when SMS dispatch fails (must propagate so BullMQ retries)', async() => {
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());
    smsSendMock.mockRejectedValue(new Error('Twilio 503: temporarily unavailable'));

    await expect(processNotification(makeJob())).rejects.toThrow(
      /Twilio 503/,
    );
  });

  it('missing SENDGRID_API_KEY throws synchronously before any dispatch is attempted', async() => {
    const original = process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_API_KEY;
    wireQuery(makeOrderRow(), makeAlertRow());

    try {
      await expect(processNotification(makeJob())).rejects.toThrow(
        /SENDGRID_API_KEY is required/,
      );
      expect(emailSendMock).not.toHaveBeenCalled();
      expect(smsSendMock).not.toHaveBeenCalled();
    } finally {
      process.env.SENDGRID_API_KEY = original;
    }
  });

  it('missing TWILIO_ACCOUNT_SID throws before any dispatch', async() => {
    const original = process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_ACCOUNT_SID;
    wireQuery(makeOrderRow(), makeAlertRow());

    try {
      await expect(processNotification(makeJob())).rejects.toThrow(
        /TWILIO_ACCOUNT_SID is required/,
      );
    } finally {
      process.env.TWILIO_ACCOUNT_SID = original;
    }
  });
});

describe('processNotification — DB write side-effects (v1.19 field-population rule)', () => {
  let emailSendMock: jest.Mock;
  let smsSendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    allowSmsByDefault();
    emailSendMock = jest.fn().mockResolvedValue(undefined);
    smsSendMock = jest.fn().mockResolvedValue(undefined);

    MockEmailService.mockImplementation(
      () =>
        ({ sendDelayEmail: emailSendMock } as unknown as EmailService),
    );
    MockSMSService.mockImplementation(
      () =>
        ({ sendDelaySMS: smsSendMock } as unknown as SMSService),
    );
  });

  it('marks email_sent=TRUE on the delay_alerts row after a successful email send', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    const updates = mockQuery.mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.startsWith('UPDATE delay_alerts'),
    );
    expect(updates.length).toBeGreaterThanOrEqual(1);
    const emailUpdate = updates.find(([sql]) =>
      typeof sql === 'string' && sql.includes('email_sent = TRUE'),
    );
    expect(emailUpdate).toBeDefined();
    // §6 R17: keyed on the ALERT (55), not the order (101). The previous
    // assertion expected [101] and so encoded the defect: one send marked
    // every alert on the order delivered. Row-count proof of the fix lives in
    // tests/integration/notification-alert-scope.test.ts, against real SQL.
    expect(emailUpdate?.[0]).toContain('WHERE id = $1');
    expect(emailUpdate?.[1]).toEqual([ALERT_ID]);
  });

  it('marks sms_sent=TRUE on the delay_alerts row after a successful SMS send', async() => {
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    const updates = mockQuery.mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.startsWith('UPDATE delay_alerts'),
    );
    const smsUpdate = updates.find(([sql]) =>
      typeof sql === 'string' && sql.includes('sms_sent = TRUE'),
    );
    expect(smsUpdate).toBeDefined();
    expect(smsUpdate?.[0]).toContain('WHERE id = $1');
    expect(smsUpdate?.[1]).toEqual([ALERT_ID]);
  });

  it('passes the full delayDetails envelope through to sendDelayEmail (every field, v1.19 rule)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const [recipient, orderInfo, delayDetails] = emailSendMock.mock.calls[0];
    expect(recipient).toBe('jane@example.com');
    expect(orderInfo).toEqual(
      expect.objectContaining({
        orderNumber: '1001',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        customerPhone: '+15558675309',
        shopDomain: 'test-shop.myshopify.com',
      }),
    );
    expect(delayDetails).toEqual({
      estimatedDelivery: '2026-05-12',
      trackingNumber: '1Z999AA1234567890',
      trackingUrl: CANONICAL_TRACKING_URL,
      delayDays: 3,
      delayReason: 'Weather delay',
    });
  });
});

describe('processNotification — merchant-vs-customer routing (Launch WS-E task E3, v1.19 dispatch rules)', () => {
  let emailSendMock: jest.Mock;
  let smsSendMock: jest.Mock;

  const MERCHANT_PAYLOAD: Partial<NotificationPayload> = {
    delayType: 'WAREHOUSE_DELAY',
    merchantEmail: 'mary@merchant-store.test',
    merchantPhone: '+15550001111',
    merchantName: 'Mary Merchant',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    allowSmsByDefault();
    emailSendMock = jest.fn().mockResolvedValue(undefined);
    smsSendMock = jest.fn().mockResolvedValue(undefined);

    MockEmailService.mockImplementation(
      () =>
        ({ sendDelayEmail: emailSendMock } as unknown as EmailService),
    );
    MockSMSService.mockImplementation(
      () =>
        ({ sendDelaySMS: smsSendMock } as unknown as SMSService),
    );
  });

  it('WAREHOUSE_DELAY → email goes to the merchant with their name, never to customer_email (positive)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob(MERCHANT_PAYLOAD));

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    const [recipient, orderInfo, delayDetails, options] =
      emailSendMock.mock.calls[0];
    expect(recipient).toBe('mary@merchant-store.test');
    expect(options).toEqual({ recipientName: 'Mary Merchant' });
    // orderInfo still describes the customer's order, field by field
    expect(orderInfo).toEqual(
      expect.objectContaining({
        orderNumber: '1001',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        shopDomain: 'test-shop.myshopify.com',
      }),
    );
    expect(delayDetails).toEqual({
      estimatedDelivery: '2026-05-12',
      trackingNumber: '1Z999AA1234567890',
      trackingUrl: CANONICAL_TRACKING_URL,
      delayDays: 3,
      delayReason: 'Weather delay',
    });
  });

  it('WAREHOUSE_DELAY → SMS goes to the merchant phone with merchant audience (positive)', async() => {
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());

    await processNotification(makeJob(MERCHANT_PAYLOAD));

    expect(smsSendMock).toHaveBeenCalledTimes(1);
    const [phone, , , options] = smsSendMock.mock.calls[0];
    expect(phone).toBe('+15550001111');
    expect(options).toEqual({ audience: 'merchant' });
  });

  it('WAREHOUSE_DELAY with no merchant contact in the payload falls back to the shops row columns', async() => {
    wireQuery(
      makeOrderRow({
        sms_enabled: false,
        merchant_email: 'row-merchant@merchant-store.test',
        merchant_name: 'Row Merchant',
      }),
      makeAlertRow(),
    );

    await processNotification(makeJob({ delayType: 'WAREHOUSE_DELAY' }));

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock.mock.calls[0][0]).toBe(
      'row-merchant@merchant-store.test',
    );
    expect(emailSendMock.mock.calls[0][3]).toEqual({
      recipientName: 'Row Merchant',
    });
  });

  it('WAREHOUSE_DELAY with NO merchant contact anywhere → nothing dispatches and customer_email is NOT used (the bug-shaped negative)', async() => {
    wireQuery(makeOrderRow(), makeAlertRow());

    await processNotification(makeJob({ delayType: 'WAREHOUSE_DELAY' }));

    expect(emailSendMock).not.toHaveBeenCalled();
    expect(smsSendMock).not.toHaveBeenCalled();
    // No sent-flag may be written when nothing dispatched
    const updates = mockQuery.mock.calls.filter(([sql]) =>
      typeof sql === 'string' && sql.startsWith('UPDATE delay_alerts'),
    );
    expect(updates).toHaveLength(0);
  });

  it('CARRIER_DELAY → dispatches to the customer, ignoring merchant contact even when present (negative)', async() => {
    wireQuery(makeOrderRow(), makeAlertRow());

    await processNotification(
      makeJob({
        delayType: 'CARRIER_DELAY',
        merchantEmail: 'mary@merchant-store.test',
        merchantPhone: '+15550001111',
        merchantName: 'Mary Merchant',
        customerEmail: 'jane@example.com',
        customerPhone: '+15558675309',
      }),
    );

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock.mock.calls[0][0]).toBe('jane@example.com');
    expect(smsSendMock).toHaveBeenCalledTimes(1);
    expect(smsSendMock.mock.calls[0][0]).toBe('+15558675309');
  });

  it('TRANSIT_DELAY → dispatches to the customer (positive)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob({ delayType: 'TRANSIT_DELAY' }));

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock.mock.calls[0][0]).toBe('jane@example.com');
  });

  it('legacy payload without delayType routes to the customer (backward compatibility, explicit)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(emailSendMock.mock.calls[0][0]).toBe('jane@example.com');
  });

  it('already-sent gate applies to the merchant route too: email_sent=true → no merchant email', async() => {
    wireQuery(
      makeOrderRow({ sms_enabled: false }),
      makeAlertRow({ email_sent: true }),
    );

    await processNotification(makeJob(MERCHANT_PAYLOAD));

    expect(emailSendMock).not.toHaveBeenCalled();
  });

  it('marks email_sent=TRUE after a successful merchant email (v1.19 field-population rule)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob(MERCHANT_PAYLOAD));

    const emailUpdate = mockQuery.mock.calls.find(([sql]) =>
      typeof sql === 'string' &&
      sql.startsWith('UPDATE delay_alerts') &&
      sql.includes('email_sent = TRUE'),
    );
    expect(emailUpdate).toBeDefined();
    // §6 R17: keyed on the ALERT (55), not the order (101). The previous
    // assertion expected [101] and so encoded the defect: one send marked
    // every alert on the order delivered. Row-count proof of the fix lives in
    // tests/integration/notification-alert-scope.test.ts, against real SQL.
    expect(emailUpdate?.[0]).toContain('WHERE id = $1');
    expect(emailUpdate?.[1]).toEqual([ALERT_ID]);
  });

  it('customer route passes the customer name as recipientName (field-population)', async() => {
    wireQuery(makeOrderRow({ sms_enabled: false }), makeAlertRow());

    await processNotification(makeJob({ delayType: 'CARRIER_DELAY' }));

    expect(emailSendMock.mock.calls[0][3]).toEqual({
      recipientName: 'Jane Doe',
    });
  });
});

describe('processNotification — settings columns come from app_settings, not shops (schema-truth fix)', () => {
  /**
   * runMigrations() puts email_enabled / sms_enabled / notification_template
   * on app_settings — only merchant_email / merchant_phone / merchant_name
   * live on shops. Reading the flags off the shops alias is runtime-fatal in
   * production. Field-by-field SQL assertions per v1.19 rules.
   */
  const SETTINGS_COLUMNS = ['email_enabled', 'sms_enabled', 'notification_template'];
  const SHOPS_COLUMNS = ['merchant_email', 'merchant_phone', 'merchant_name'];

  it('order+settings SELECT joins app_settings and sources every settings flag from it', async() => {
    wireQuery(makeOrderRow(), makeAlertRow());

    await processNotification(makeJob());

    const settingsCall = mockQuery.mock.calls.find(
      ([sql]) =>
        typeof sql === 'string' &&
        sql.includes('FROM orders') &&
        sql.includes('WHERE o.id'),
    );
    expect(settingsCall).toBeDefined();
    const sql = settingsCall?.[0] as string;

    const joinMatch = sql.match(/JOIN\s+app_settings\s+(\w+)\s+ON/);
    expect(joinMatch).not.toBeNull();
    const alias = joinMatch?.[1] as string;

    for (const col of SETTINGS_COLUMNS) {
      expect(sql).toContain(`${alias}.${col}`);
      expect(sql).not.toMatch(new RegExp(`\\bs\\.${col}\\b`));
    }
    for (const col of SHOPS_COLUMNS) {
      expect(sql).toMatch(new RegExp(`\\bs\\.${col}\\b`));
    }
  });
});

describe('processNotification — SMS plan-gate (Launch WS-D fix d)', () => {
  let emailSendMock: jest.Mock;
  let smsSendMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    allowSmsByDefault();
    emailSendMock = jest.fn().mockResolvedValue(undefined);
    smsSendMock = jest.fn().mockResolvedValue(undefined);
    MockEmailService.mockImplementation(
      () => ({ sendDelayEmail: emailSendMock } as unknown as EmailService),
    );
    MockSMSService.mockImplementation(
      () => ({ sendDelaySMS: smsSendMock } as unknown as SMSService),
    );
  });

  it('dispatches SMS when the shop plan allows it (positive)', async() => {
    mockGetCurrentPlan.mockResolvedValue('pro');
    mockIsSmsAllowed.mockReturnValue(true);
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(smsSendMock).toHaveBeenCalledTimes(1);
    // Gate consulted the shop's real tier (not just sms_enabled)
    expect(mockGetCurrentPlan).toHaveBeenCalledWith('test-shop.myshopify.com');
  });

  it('does NOT dispatch SMS on the free tier even when sms_enabled is true (negative — the billing-leak guard)', async() => {
    mockGetCurrentPlan.mockResolvedValue('free');
    mockIsSmsAllowed.mockReturnValue(false);
    wireQuery(makeOrderRow({ email_enabled: false }), makeAlertRow());

    await processNotification(makeJob());

    expect(smsSendMock).not.toHaveBeenCalled();
    // and sms_sent is never marked
    const smsUpdate = mockQuery.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes('sms_sent = TRUE'),
    );
    expect(smsUpdate).toBeUndefined();
  });

  it('free tier still sends the customer email (only SMS is gated)', async() => {
    mockGetCurrentPlan.mockResolvedValue('free');
    mockIsSmsAllowed.mockReturnValue(false);
    wireQuery(makeOrderRow(), makeAlertRow());

    await processNotification(makeJob());

    expect(emailSendMock).toHaveBeenCalledTimes(1);
    expect(smsSendMock).not.toHaveBeenCalled();
  });
});
