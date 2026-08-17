import * as sgMail from "@sendgrid/mail";
import { OrderInfo, DelayDetails } from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";

/**
 * Dev/test-only stand-in. Production must set SENDGRID_DELAY_TEMPLATE_ID to
 * the real dynamic-template ID — create it once with
 * `npm run sendgrid:create-template` (Launch WS-E, task E1).
 */
const PLACEHOLDER_TEMPLATE_ID = "d-delay-notification-template";

/**
 * Resolve the SendGrid dynamic-template ID from the environment.
 * Fails loudly in production when unset — sending with the placeholder ID
 * would 400 at SendGrid and silently drop every delay notification.
 */
function resolveDelayTemplateId(): string {
  const configured = process.env.SENDGRID_DELAY_TEMPLATE_ID?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SENDGRID_DELAY_TEMPLATE_ID is not set. Refusing to send delay emails " +
        "with the placeholder template in production. Create the template once " +
        "with `npm run sendgrid:create-template` and set the printed d-… ID " +
        "as SENDGRID_DELAY_TEMPLATE_ID.",
    );
  }
  return PLACEHOLDER_TEMPLATE_ID;
}

/**
 * Dev/test-only stand-in. `.example` is reserved by RFC 2606, so unlike the
 * `delayguard.app` this replaces, it can never collide with a real domain
 * someone else owns.
 */
const PLACEHOLDER_FROM_ADDRESS = "noreply@delayguard.example";

/**
 * Resolve the From address from the environment (LAUNCH_PLAN R1).
 *
 * This was hardcoded to `noreply@delayguard.app` from the first commit,
 * four months before that domain was registered — and it was registered by
 * someone we cannot identify. SendGrid rejects any From address that is not
 * a verified sender identity, and a domain you do not control cannot be
 * verified, so the hardcoded value made the only launch-critical channel
 * unusable.
 *
 * Fails loudly in production when unset, matching `resolveDelayTemplateId`:
 * a refused send names its own cause, a silently bouncing one does not.
 */
export function resolveFromAddress(): string {
  const configured = process.env.SENDGRID_FROM_EMAIL?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SENDGRID_FROM_EMAIL is not set. Refusing to send delay emails from " +
        "a placeholder address in production. Set it to an address on a " +
        "domain authenticated in SendGrid (Settings → Sender Authentication).",
    );
  }
  return PLACEHOLDER_FROM_ADDRESS;
}

export interface SendDelayEmailOptions {
  /**
   * Greeting name for the template's {{recipientName}} merge field.
   * Defaults to the order's customer name; merchant-routed alerts
   * (warehouse delays) pass the merchant's name instead (WS-E, task E3).
   */
  recipientName?: string;
}

export class EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    sgMail.setApiKey(apiKey);
  }

  async sendDelayEmail(
    email: string,
    orderInfo: OrderInfo,
    delayDetails: DelayDetails,
    options?: SendDelayEmailOptions,
  ): Promise<void> {
    const msg = {
      to: email,
      from: resolveFromAddress(),
      templateId: resolveDelayTemplateId(),
      dynamicTemplateData: {
        recipientName: options?.recipientName ?? orderInfo.customerName,
        customerName: orderInfo.customerName,
        orderNumber: orderInfo.orderNumber,
        newDeliveryDate: delayDetails.estimatedDelivery,
        trackingNumber: delayDetails.trackingNumber,
        trackingUrl: delayDetails.trackingUrl,
        delayDays: delayDetails.delayDays,
        delayReason: delayDetails.delayReason,
      },
    };

    try {
      await sgMail.send(msg);
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  async ping(): Promise<PingResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    try {
      const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        return { status: "healthy", latencyMs };
      }
      return {
        status: "degraded",
        latencyMs,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "unhealthy",
          latencyMs,
          error: `timeout after ${PING_TIMEOUT_MS}ms`,
        };
      }
      return {
        status: "unhealthy",
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
