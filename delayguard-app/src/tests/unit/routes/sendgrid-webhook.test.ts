/**
 * SendGrid Webhook Handler Tests (Phase 1.3)
 *
 * Tests for SendGrid webhook integration that tracks email engagement.
 *
 * TDD Red Phase: Writing tests FIRST before implementation.
 *
 * Test Coverage:
 * - Webhook signature verification
 * - Email 'open' event handling
 * - Email 'click' event handling
 * - Multiple events in single webhook
 * - Invalid signatures (security)
 * - Missing message IDs
 * - Database update logic
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { Context } from 'koa';
import crypto from 'crypto';

describe('SendGrid Webhook Handler (Phase 1.3)', () => {
  let mockQuery: jest.Mock;
  let mockLogger: Record<string, jest.Mock>;
  let sendgridWebhook: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.SENDGRID_WEBHOOK_SECRET = 'test-webhook-secret-key';

    // Mock database query function
    mockQuery = jest.fn();
    jest.mock('../../../database/connection', () => ({
      query: mockQuery,
    }));

    // Mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    jest.mock('../../../utils/logger', () => ({
      logger: mockLogger,
    }));

    // Clear module cache and import fresh
    jest.resetModules();
    sendgridWebhook = await import('../../../routes/sendgrid-webhook');
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Webhook Signature Verification', () => {
    it('should reject webhook with missing signature', async () => {
      const ctx = createMockContext({
        body: [{ event: 'open', sg_message_id: 'test-123' }],
        headers: {}, // No signature
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(401);
      expect(ctx.body).toEqual({ error: 'Missing webhook signature' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SendGrid webhook received without signature')
      );
    });

    it('should reject webhook with invalid signature', async () => {
      const ctx = createMockContext({
        body: [{ event: 'open', sg_message_id: 'test-123' }],
        headers: {
          'x-twilio-email-event-webhook-signature': 'invalid-signature',
          'x-twilio-email-event-webhook-timestamp': Date.now().toString(),
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(401);
      expect(ctx.body).toEqual({ error: 'Invalid webhook signature' });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SendGrid webhook signature verification failed')
      );
    });

    it('should accept webhook with valid signature', async () => {
      const timestamp = Date.now().toString();
      const payload = JSON.stringify([{ event: 'open', sg_message_id: 'test-123' }]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      (mockQuery as any).mockResolvedValueOnce([]); // No delay alert found (for this test)

      const ctx = createMockContext({
        body: [{ event: 'open', sg_message_id: 'test-123' }],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid signature')
      );
    });

    it('should reject webhook with timestamp older than 10 minutes', async () => {
      const oldTimestamp = (Date.now() - 11 * 60 * 1000).toString(); // 11 minutes ago
      const payload = JSON.stringify([{ event: 'open', sg_message_id: 'test-123' }]);
      const signature = generateValidSignature(payload, oldTimestamp, 'test-webhook-secret-key');

      const ctx = createMockContext({
        body: [{ event: 'open', sg_message_id: 'test-123' }],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': oldTimestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(401);
      // Note: verifyWebhookSignature checks timestamp age and returns false,
      // so the handler returns "Invalid webhook signature" message
      expect(ctx.body).toEqual({ error: 'Invalid webhook signature' });
    });
  });

  describe('Email Open Event Handling', () => {
    it('should update delay_alert when email is opened', async () => {
      const timestamp = Date.now().toString();
      const messageId = 'sendgrid-msg-123';
      const payload = JSON.stringify([
        {
          event: 'open',
          sg_message_id: messageId,
          timestamp: 1635724800,
          email: 'customer@example.com',
        },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      // Mock database: delay alert exists
      (mockQuery as any).mockResolvedValueOnce([{ id: 1, order_id: 100 }]);
      // Mock database: update query
      (mockQuery as any).mockResolvedValueOnce({});

      const ctx = createMockContext({
        body: [
          {
            event: 'open',
            sg_message_id: messageId,
            timestamp: 1635724800,
            email: 'customer@example.com',
          },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ success: true, processed: 1 });

      // Verify database queries
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id'),
        [messageId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delay_alerts'),
        expect.arrayContaining([expect.any(Number), 1])
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Email opened event recorded'),
        expect.any(Object)
      );
    });

    it('should handle email open event for non-existent message gracefully', async () => {
      const timestamp = Date.now().toString();
      const messageId = 'unknown-msg-123';
      const payload = JSON.stringify([
        {
          event: 'open',
          sg_message_id: messageId,
          timestamp: 1635724800,
        },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      // Mock database: no delay alert found
      (mockQuery as any).mockResolvedValueOnce([]);

      const ctx = createMockContext({
        body: [
          {
            event: 'open',
            sg_message_id: messageId,
            timestamp: 1635724800,
          },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ success: true, processed: 1 });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('No delay alert found'),
        expect.objectContaining({ messageId })
      );
    });
  });

  describe('Email Click Event Handling', () => {
    it('should update delay_alert when email link is clicked', async () => {
      const timestamp = Date.now().toString();
      const messageId = 'sendgrid-msg-456';
      const payload = JSON.stringify([
        {
          event: 'click',
          sg_message_id: messageId,
          timestamp: 1635724900,
          email: 'customer@example.com',
          url: 'https://track.example.com/order/123',
        },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      // Mock database: delay alert exists
      (mockQuery as any).mockResolvedValueOnce([{ id: 2, order_id: 200 }]);
      // Mock database: update query
      (mockQuery as any).mockResolvedValueOnce({});

      const ctx = createMockContext({
        body: [
          {
            event: 'click',
            sg_message_id: messageId,
            timestamp: 1635724900,
            email: 'customer@example.com',
            url: 'https://track.example.com/order/123',
          },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ success: true, processed: 1 });

      // Verify database queries
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id'),
        [messageId]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE delay_alerts'),
        expect.arrayContaining([expect.any(Number), 2])
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Email clicked event recorded'),
        expect.any(Object)
      );
    });
  });

  describe('Multiple Events Handling', () => {
    it('should process multiple events in a single webhook', async () => {
      const timestamp = Date.now().toString();
      const payload = JSON.stringify([
        { event: 'open', sg_message_id: 'msg-1', timestamp: 1635724800 },
        { event: 'click', sg_message_id: 'msg-2', timestamp: 1635724900 },
        { event: 'open', sg_message_id: 'msg-3', timestamp: 1635725000 },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      // Mock database responses for each event
      (mockQuery as any)
        .mockResolvedValueOnce([{ id: 1 }]) // msg-1 found
        .mockResolvedValueOnce({}) // update msg-1
        .mockResolvedValueOnce([{ id: 2 }]) // msg-2 found
        .mockResolvedValueOnce({}) // update msg-2
        .mockResolvedValueOnce([]) // msg-3 not found
        ;

      const ctx = createMockContext({
        body: [
          { event: 'open', sg_message_id: 'msg-1', timestamp: 1635724800 },
          { event: 'click', sg_message_id: 'msg-2', timestamp: 1635724900 },
          { event: 'open', sg_message_id: 'msg-3', timestamp: 1635725000 },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ success: true, processed: 3 });

      expect(mockLogger.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const timestamp = Date.now().toString();
      const payload = JSON.stringify([
        { event: 'open', sg_message_id: 'msg-1', timestamp: 1635724800 },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      // Mock database error
      (mockQuery as any).mockRejectedValueOnce(new Error('Database connection failed'));

      const ctx = createMockContext({
        body: [
          { event: 'open', sg_message_id: 'msg-1', timestamp: 1635724800 },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({ error: 'Internal server error' });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should ignore unsupported event types', async () => {
      const timestamp = Date.now().toString();
      const payload = JSON.stringify([
        { event: 'delivered', sg_message_id: 'msg-1', timestamp: 1635724800 },
        { event: 'bounce', sg_message_id: 'msg-2', timestamp: 1635724900 },
      ]);
      const signature = generateValidSignature(payload, timestamp, 'test-webhook-secret-key');

      const ctx = createMockContext({
        body: [
          { event: 'delivered', sg_message_id: 'msg-1', timestamp: 1635724800 },
          { event: 'bounce', sg_message_id: 'msg-2', timestamp: 1635724900 },
        ],
        rawBody: payload,
        headers: {
          'x-twilio-email-event-webhook-signature': signature,
          'x-twilio-email-event-webhook-timestamp': timestamp,
        },
      });

      await sendgridWebhook.handleSendGridWebhook(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ success: true, processed: 0 });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Ignoring event type'),
        expect.any(Object)
      );
    });
  });
});

// Helper function to create mock Koa context
function createMockContext(options: {
  body: any;
  rawBody?: string;
  headers: Record<string, string>;
}): Context {
  return {
    request: {
      body: options.body,
      rawBody: options.rawBody || JSON.stringify(options.body),
      headers: options.headers,
    },
    status: 200,
    body: {},
    get: (header: string) => options.headers[header.toLowerCase()],
  } as unknown as Context;
}

// Helper function to generate valid SendGrid webhook signature
function generateValidSignature(
  payload: string,
  timestamp: string,
  secret: string
): string {
  const signedPayload = timestamp + payload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64');
  return signature;
}
