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

jest.mock('../../../database/connection');
jest.mock('../../../services/email-service');
jest.mock('../../../services/sms-service');
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
}

interface AlertRow {
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
    ...overrides,
  };
}

function makeAlertRow(overrides: Partial<AlertRow> = {}): AlertRow {
  return { email_sent: false, sms_sent: false, ...overrides };
}

function makeJob(): Job<{
  orderId: number;
  delayDetails: {
    estimatedDelivery: string;
    trackingNumber: string;
    trackingUrl: string;
    delayDays: number;
    delayReason: string;
  };
  shopDomain: string;
}> {
  return {
    data: {
      orderId: 101,
      delayDetails: {
        estimatedDelivery: '2026-05-12',
        trackingNumber: '1Z999AA1234567890',
        trackingUrl: 'https://tracking.example.com/1Z999AA1234567890',
        delayDays: 3,
        delayReason: 'Weather delay',
      },
      shopDomain: 'test-shop.myshopify.com',
    },
  } as unknown as Job<{
    orderId: number;
    delayDetails: {
      estimatedDelivery: string;
      trackingNumber: string;
      trackingUrl: string;
      delayDays: number;
      delayReason: string;
    };
    shopDomain: string;
  }>;
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

  it('re-throws when no delay_alert row exists for the order', async() => {
    wireQuery(makeOrderRow(), null);

    await expect(processNotification(makeJob())).rejects.toThrow(
      /No delay alert found/,
    );
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
    expect(emailUpdate?.[1]).toEqual([101]);
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
    expect(smsUpdate?.[1]).toEqual([101]);
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
      trackingUrl: 'https://tracking.example.com/1Z999AA1234567890',
      delayDays: 3,
      delayReason: 'Weather delay',
    });
  });
});
