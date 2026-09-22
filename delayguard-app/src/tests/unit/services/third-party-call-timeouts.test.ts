/**
 * Every third-party call the money path depends on must give up before the
 * platform does.
 *
 * Four calls had no timeout at all: the Shopify Admin GraphQL fetch, the OAuth
 * token exchange, the SendGrid send and the Twilio send. Each runs inside a
 * Vercel function capped at 30s, so an upstream that accepts the connection
 * and then stops answering burns the whole invocation and the function is
 * killed — no error, no BullMQ retry, no alert. The CLAUDE.md third-party
 * invariant has named these as an outstanding gap since 2026-07.
 *
 * A timeout must THROW, so `attempts: 3` exponential backoff gets its turn.
 * Swallowing it would turn a slow upstream into a silently dropped alert,
 * which is the failure the retry exists to prevent.
 *
 * The two `fetch` callers are checked by driving their AbortSignal — the
 * pattern `ping()` in email-service.ts already uses — rather than by asserting
 * a signal is merely present: a signal that is never wired to a timer looks
 * identical from the outside.
 */
jest.mock('../../../utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../database/connection', () => ({ query: jest.fn() }));

const mockSend = jest.fn();
jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: { setApiKey: jest.fn(), send: (...args: unknown[]) => mockSend(...args) },
}));

const mockMessagesCreate = jest.fn();
jest.mock('twilio', () => () => ({
  messages: { create: (...args: unknown[]) => mockMessagesCreate(...args) },
  api: { v2010: { accounts: () => ({ fetch: jest.fn() }) } },
}));

import { createGraphQLClient } from '../../../services/shopify-service';
import { ShopAuthService } from '../../../services/shop-auth-service';
import { EmailService } from '../../../services/email-service';
import { SMSService } from '../../../services/sms-service';
import type { OrderInfo, DelayDetails } from '../../../types';

/** Every one of the four calls is budgeted the same 10s. */
const EXPECTED_TIMEOUT_MS = 10_000;

const ORDER: OrderInfo = {
  id: '1',
  orderNumber: '#DG1001',
  customerName: 'Ada Lovelace',
  customerEmail: 'ada@example.com',
  customerPhone: '+15551230000',
  shopDomain: 'shop.myshopify.com',
  createdAt: new Date('2026-09-01T00:00:00Z'),
};

const DELAY: DelayDetails = {
  estimatedDelivery: '2026-10-01',
  trackingNumber: 'TRACK-1',
  trackingUrl: 'https://track.example/1',
  delayDays: 3,
  delayReason: 'CARRIER_DELAY',
};

/** A promise that settles only when the code under test gives up on it. */
function neverSettles(): Promise<never> {
  return new Promise<never>(() => {});
}

/**
 * Resolve once `fetch` has been entered, so the timer the call installed
 * exists before the clock is advanced.
 */
function hangingFetch(
  onCall: (signal: AbortSignal | undefined) => void,
): jest.Mock {
  return jest.fn((_url: string, options?: { signal?: AbortSignal }) => {
    onCall(options?.signal);
    return new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => {
        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    });
  });
}

describe('third-party calls abort instead of burning the Vercel function cap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Shopify Admin GraphQL: aborts the fetch and throws', async() => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = hangingFetch((signal) => {
      capturedSignal = signal;
    }) as unknown as typeof fetch;

    const client = await createGraphQLClient('shop.myshopify.com', 'shpat_x');
    const pending = client.query('{ shop { name } }');
    const assertion = expect(pending).rejects.toThrow();

    await Promise.resolve();
    jest.advanceTimersByTime(EXPECTED_TIMEOUT_MS);
    await assertion;

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('OAuth token exchange: aborts the fetch and throws', async() => {
    let capturedSignal: AbortSignal | undefined;
    global.fetch = hangingFetch((signal) => {
      capturedSignal = signal;
    }) as unknown as typeof fetch;

    const pending = new ShopAuthService().exchangeCodeForToken(
      'shop.myshopify.com',
      'auth-code',
    );
    const assertion = expect(pending).rejects.toThrow();

    await Promise.resolve();
    jest.advanceTimersByTime(EXPECTED_TIMEOUT_MS);
    await assertion;

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('SendGrid send: rejects naming the provider and the budget', async() => {
    mockSend.mockImplementation(neverSettles);

    const pending = new EmailService('SG.key').sendDelayEmail(
      'ada@example.com',
      ORDER,
      DELAY,
    );
    const assertion = expect(pending).rejects.toThrow(
      new RegExp(`SendGrid[\\s\\S]*${EXPECTED_TIMEOUT_MS}`, 'i'),
    );

    await Promise.resolve();
    jest.advanceTimersByTime(EXPECTED_TIMEOUT_MS);
    await assertion;
  });

  it('Twilio send: rejects naming the provider and the budget', async() => {
    mockMessagesCreate.mockImplementation(neverSettles);

    const pending = new SMSService('AC1', 'token', '+15550000000').sendDelaySMS(
      '+15551230000',
      ORDER,
      DELAY,
    );
    const assertion = expect(pending).rejects.toThrow(
      new RegExp(`Twilio[\\s\\S]*${EXPECTED_TIMEOUT_MS}`, 'i'),
    );

    await Promise.resolve();
    jest.advanceTimersByTime(EXPECTED_TIMEOUT_MS);
    await assertion;
  });

  it('a send that answers in time still resolves', async() => {
    // Guards the over-correction: adding a deadline must not make every send
    // fail. Passes in both states by design — see tests.md.
    mockSend.mockResolvedValue([{ statusCode: 202 }]);
    mockMessagesCreate.mockResolvedValue({ sid: 'SM1' });

    await expect(
      new EmailService('SG.key').sendDelayEmail('ada@example.com', ORDER, DELAY),
    ).resolves.toBeUndefined();
    await expect(
      new SMSService('AC1', 'token', '+15550000000').sendDelaySMS(
        '+15551230000',
        ORDER,
        DELAY,
      ),
    ).resolves.toBeUndefined();
  });
});
