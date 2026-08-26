/**
 * LAUNCH_PLAN §6 R18 — the three defects the FIRST REAL delivered email
 * exposed, pinned against the data a real order actually carries.
 *
 * Every prior check ran against sample data engineered to populate every
 * field. Production order 1 (`#DG1001`, unfulfilled, warehouse delay) carries
 * a hash-prefixed order number, NO estimated delivery date and NO tracking —
 * and the delivered message read:
 *
 *     Order ##DG1001 … New estimated delivery:            ← empty
 *
 * These tests use that row's real shape, not a populated fixture. The same
 * three defects exist in the SMS body, from the same cause.
 */
import { EmailService } from '../../../services/email-service';
import { SMSService } from '../../../services/sms-service';
import { OrderInfo, DelayDetails } from '../../../types';

const sgSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: { setApiKey: jest.fn(), send: (...args: unknown[]) => sgSend(...args) },
}));

// sms-service.ts uses `require("twilio")`, so the mock must BE the function.
const twilioCreate = jest.fn().mockResolvedValue({ sid: 'SM-test' });
jest.mock('twilio', () =>
  jest.fn(() => ({ messages: { create: (...a: unknown[]) => twilioCreate(...a) } })),
);

/** Production order 1, exactly as `orders` stores it. */
function realOrder(overrides: Partial<OrderInfo> = {}): OrderInfo {
  return {
    id: '9900112233',
    orderNumber: '#DG1001',
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    customerPhone: '+15551230000',
    shopDomain: 'delayguard-dev.myshopify.com',
    createdAt: new Date('2026-07-30T23:14:46Z'),
    ...overrides,
  } as OrderInfo;
}

/** A warehouse delay on an unfulfilled order: no ETA, no tracking. */
function sparseDelay(overrides: Partial<DelayDetails> = {}): DelayDetails {
  return {
    estimatedDelivery: '',
    trackingNumber: '',
    trackingUrl: '',
    delayDays: 23,
    delayReason: 'WAREHOUSE_DELAY',
    ...overrides,
  } as DelayDetails;
}

describe('EmailService merge data — §6 R18', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    sgSend.mockClear();
    process.env.SENDGRID_DELAY_TEMPLATE_ID = 'd-test';
    process.env.SENDGRID_FROM_EMAIL = 'noreply@delayguardapp.com';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function mergeData(delay: DelayDetails = sparseDelay()): Promise<Record<string, unknown>> {
    await new EmailService('SG.test').sendDelayEmail('to@example.com', realOrder(), delay);
    const [msg] = sgSend.mock.calls[0] as [{ dynamicTemplateData: Record<string, unknown> }];
    return msg.dynamicTemplateData;
  }

  it('supplies the bare order number — the template owns the # (defect 1)', async() => {
    // The live template renders `#{{orderNumber}}`; passing '#DG1001'
    // produced 'Order ##DG1001' in the delivered message.
    expect((await mergeData()).orderNumber).toBe('DG1001');
  });

  it('never leaves the delivery-date label with nothing after it (defect 2)', async() => {
    const newDeliveryDate = (await mergeData()).newDeliveryDate as string;
    expect(newDeliveryDate).not.toBe('');
    expect(newDeliveryDate.trim().length).toBeGreaterThan(0);
  });

  it('passes a real estimated delivery through untouched when the order has one', async() => {
    // Guards the over-correction: the fallback must not replace real data.
    const data = await mergeData(sparseDelay({ estimatedDelivery: '2026-09-04' }));
    expect(data.newDeliveryDate).toBe('2026-09-04');
  });
});

describe('SMSService body — §6 R18 (same defects, second channel)', () => {
  beforeEach(() => twilioCreate.mockClear());

  async function body(
    delay: DelayDetails = sparseDelay(),
    audience?: 'merchant' | 'customer',
  ): Promise<string> {
    await new SMSService('AC', 'tok', '+15550000000').sendDelaySMS(
      '+15551230000',
      realOrder(),
      delay,
      audience ? { audience } : undefined,
    );
    return (twilioCreate.mock.calls[0][0] as { body: string }).body;
  }

  it('does not double the order-number prefix', async() => {
    expect(await body()).toContain('#DG1001');
    expect(await body()).not.toContain('##DG1001');
  });

  it('does not emit a bare "New delivery:" with nothing after it', async() => {
    expect(await body()).not.toMatch(/New delivery:\s*\./);
  });

  it('omits the tracking clause entirely when there is no tracking URL', async() => {
    expect(await body()).not.toMatch(/Track:\s*$/);
    expect(await body()).not.toContain('Track: .');
  });

  // Passes in both the broken and fixed states, deliberately (tests.md): it
  // pins the OTHER half of the contract, so the "drop the dangling Track:"
  // fix cannot quietly drop real tracking links too.
  it('still includes the tracking link when the order has one', async() => {
    const withTracking = await body(
      sparseDelay({ trackingUrl: 'https://ups.com/track?t=1Z999' }),
    );
    expect(withTracking).toContain('https://ups.com/track?t=1Z999');
  });

  it('applies the same rules to the merchant-audience body', async() => {
    const merchantBody = await body(sparseDelay(), 'merchant');
    expect(merchantBody).not.toContain('##DG1001');
    expect(merchantBody).not.toMatch(/New ETA:\s*\./);
    expect(merchantBody).not.toMatch(/Track:\s*$/);
  });
});
