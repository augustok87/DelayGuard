/**
 * SendGrid Webhook Handler (Phase 1.3)
 *
 * Handles email engagement events from SendGrid:
 * - Email opened (open event)
 * - Email link clicked (click event)
 *
 * Updates delay_alerts table with engagement tracking data.
 *
 * Security:
 * - Verifies webhook signature using SENDGRID_WEBHOOK_SECRET
 * - Rejects webhooks with timestamps older than 10 minutes
 *
 * Implements IMPLEMENTATION_PLAN.md Phase 1.3 requirements
 */

import type { Context } from "koa";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { query } from "../database/connection";

/**
 * SendGrid webhook event structure
 * @see https://docs.sendgrid.com/for-developers/tracking-events/event
 */
interface SendGridEvent {
  event: string; // 'open', 'click', 'delivered', 'bounce', etc.
  sg_message_id: string;
  timestamp: number; // Unix timestamp
  email?: string;
  url?: string; // Present for 'click' events
}

/**
 * Verify SendGrid webhook signature
 *
 * @param payload - Raw webhook payload (JSON string)
 * @param signature - Signature from X-Twilio-Email-Event-Webhook-Signature header
 * @param timestamp - Timestamp from X-Twilio-Email-Event-Webhook-Timestamp header
 * @returns true if signature is valid
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  const secret = process.env.SENDGRID_WEBHOOK_SECRET;

  if (!secret) {
    logger.error("SENDGRID_WEBHOOK_SECRET not configured");
    return false;
  }

  // Check timestamp freshness (prevent replay attacks)
  const now = Date.now();
  const webhookTime = parseInt(timestamp, 10);
  const tenMinutesInMs = 10 * 60 * 1000;

  if (now - webhookTime > tenMinutesInMs) {
    logger.warn("Webhook timestamp too old", {
      timestamp: webhookTime,
      age: now - webhookTime,
    });
    return false;
  }

  // Verify signature
  // SendGrid signs: timestamp + payload
  const signedPayload = timestamp + payload;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("base64");

  return signature === expectedSignature;
}

/**
 * Process email 'open' event
 *
 * @param event - SendGrid event data
 */
async function processOpenEvent(event: SendGridEvent): Promise<void> {
  try {
    logger.debug("Processing email open event", {
      messageId: event.sg_message_id,
      email: event.email,
    });

    // Find delay alert by SendGrid message ID
    const alerts = await query<{ id: number; order_id: number }>(
      "SELECT id, order_id FROM delay_alerts WHERE sendgrid_message_id = $1",
      [event.sg_message_id],
    );

    if (alerts.length === 0) {
      logger.debug("No delay alert found for message ID", {
        messageId: event.sg_message_id,
      });
      return;
    }

    const alert = alerts[0];

    // Update delay_alert with open tracking data
    await query(
      `UPDATE delay_alerts
       SET email_opened = TRUE,
           email_opened_at = to_timestamp($1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [event.timestamp, alert.id],
    );

    logger.info("Email opened event recorded", {
      alertId: alert.id,
      orderId: alert.order_id,
      messageId: event.sg_message_id,
      email: event.email,
    });
  } catch (error) {
    logger.error("Error processing email open event", error as Error, {
      messageId: event.sg_message_id,
    });
    throw error;
  }
}

/**
 * Process email 'click' event
 *
 * @param event - SendGrid event data
 */
async function processClickEvent(event: SendGridEvent): Promise<void> {
  try {
    logger.debug("Processing email click event", {
      messageId: event.sg_message_id,
      email: event.email,
      url: event.url,
    });

    // Find delay alert by SendGrid message ID
    const alerts = await query<{ id: number; order_id: number }>(
      "SELECT id, order_id FROM delay_alerts WHERE sendgrid_message_id = $1",
      [event.sg_message_id],
    );

    if (alerts.length === 0) {
      logger.debug("No delay alert found for message ID", {
        messageId: event.sg_message_id,
      });
      return;
    }

    const alert = alerts[0];

    // Update delay_alert with click tracking data
    await query(
      `UPDATE delay_alerts
       SET email_clicked = TRUE,
           email_clicked_at = to_timestamp($1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [event.timestamp, alert.id],
    );

    logger.info("Email clicked event recorded", {
      alertId: alert.id,
      orderId: alert.order_id,
      messageId: event.sg_message_id,
      email: event.email,
      url: event.url,
    });
  } catch (error) {
    logger.error("Error processing email click event", error as Error, {
      messageId: event.sg_message_id,
    });
    throw error;
  }
}

/**
 * Handle SendGrid webhook POST request
 *
 * Endpoint: POST /webhooks/sendgrid
 *
 * @param ctx - Koa context
 */
export async function handleSendGridWebhook(ctx: Context): Promise<void> {
  try {
    // Extract signature and timestamp from headers
    const signature = ctx.get("x-twilio-email-event-webhook-signature");
    const timestamp = ctx.get("x-twilio-email-event-webhook-timestamp");

    if (!signature) {
      logger.warn("SendGrid webhook received without signature header");
      ctx.status = 401;
      ctx.body = { error: "Missing webhook signature" };
      return;
    }

    if (!timestamp) {
      logger.warn("SendGrid webhook received without timestamp header");
      ctx.status = 401;
      ctx.body = { error: "Missing webhook timestamp" };
      return;
    }

    // Get raw body for signature verification
    const rawBody =
      (ctx.request as any).rawBody || JSON.stringify(ctx.request.body);

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      logger.warn("SendGrid webhook signature verification failed");
      ctx.status = 401;
      ctx.body = { error: "Invalid webhook signature" };
      return;
    }

    // Check timestamp age
    const now = Date.now();
    const webhookTime = parseInt(timestamp, 10);
    const tenMinutesInMs = 10 * 60 * 1000;

    if (now - webhookTime > tenMinutesInMs) {
      ctx.status = 401;
      ctx.body = { error: "Webhook timestamp too old" };
      return;
    }

    // Parse events
    const events: SendGridEvent[] = Array.isArray(ctx.request.body)
      ? ctx.request.body
      : [ctx.request.body];

    logger.info(`📧 SendGrid webhook received: ${events.length} events`);

    let processedCount = 0;

    // Process each event
    for (const event of events) {
      if (event.event === "open") {
        await processOpenEvent(event);
        processedCount++;
      } else if (event.event === "click") {
        await processClickEvent(event);
        processedCount++;
      } else {
        // Ignore other event types (delivered, bounce, etc.)
        logger.debug("Ignoring event type", {
          eventType: event.event,
          messageId: event.sg_message_id,
        });
      }
    }

    ctx.status = 200;
    ctx.body = { success: true, processed: processedCount };
  } catch (error) {
    logger.error("Error handling SendGrid webhook", error as Error);
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
}
