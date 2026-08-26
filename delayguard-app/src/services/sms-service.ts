const twilio = require("twilio");
import { OrderInfo, DelayDetails } from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";
import { formatOrderNumber } from "../utils/order-number";

export interface SendDelaySMSOptions {
  /**
   * Who receives the SMS. Merchant-routed alerts (warehouse delays,
   * WS-E task E3) use operational copy instead of "your order".
   */
  audience?: "customer" | "merchant";
}

interface TwilioAccountContext {
  fetch: () => Promise<unknown>;
}

interface TwilioClient {
  messages: {
    create: (params: {
      body: string;
      from: string;
      to: string;
    }) => Promise<unknown>;
  };
  api: {
    v2010: {
      accounts: (sid: string) => TwilioAccountContext;
    };
  };
}

/** Mirrors email-service's fallback so both channels say the same thing. */
const NO_DELIVERY_ESTIMATE = "Not yet available";

export class SMSService {
  private client: TwilioClient;
  private phoneNumber: string;
  private accountSid: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.client = twilio(accountSid, authToken) as TwilioClient;
    this.phoneNumber = phoneNumber;
    this.accountSid = accountSid;
  }

  async sendDelaySMS(
    phone: string,
    orderInfo: OrderInfo,
    delayDetails: DelayDetails,
    options?: SendDelaySMSOptions,
  ): Promise<void> {
    // §6 R18: the same three defects the first real delivered EMAIL exposed
    // live here too, because a real order carries a `#`-prefixed number and,
    // when it is unfulfilled, neither an ETA nor tracking. Interpolating those
    // blanks produced `order ##DG1001 … New delivery: . Track: `.
    const orderNumber = formatOrderNumber(orderInfo.orderNumber);
    const eta = delayDetails.estimatedDelivery?.trim() || NO_DELIVERY_ESTIMATE;
    // No tracking URL means there is nothing to link to — drop the clause
    // rather than send a dangling `Track: `. Never fabricate a link.
    const tracking = delayDetails.trackingUrl?.trim()
      ? ` Track: ${delayDetails.trackingUrl.trim()}`
      : "";

    // Merchant-routed alerts (warehouse delays, WS-E task E3) get operational
    // copy about the customer's order; customers get second-person copy.
    const message =
      options?.audience === "merchant"
        ? `DelayGuard: order #${orderNumber} for ${orderInfo.customerName} is delayed (${delayDetails.delayReason}). New ETA: ${eta}.${tracking}`
        : `Hi ${orderInfo.customerName}, your order #${orderNumber} is delayed. New delivery: ${eta}.${tracking}`;

    try {
      await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: phone,
      });
    } catch (error) {
      throw new Error(`Failed to send SMS: ${error}`);
    }
  }

  // Twilio's Node SDK doesn't accept an AbortSignal, so we race the fetch
  // promise against a timeout instead. The Twilio request keeps running in the
  // background on timeout — fine for a liveness probe; the result is what
  // matters, not strict cancellation.
  async ping(): Promise<PingResult> {
    const startTime = Date.now();
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      const fetchPromise = this.client.api.v2010
        .accounts(this.accountSid)
        .fetch();
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("__PING_TIMEOUT__")),
          PING_TIMEOUT_MS,
        );
      });
      await Promise.race([fetchPromise, timeoutPromise]);
      return { status: "healthy", latencyMs: Date.now() - startTime };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      if (error instanceof Error && error.message === "__PING_TIMEOUT__") {
        return {
          status: "unhealthy",
          latencyMs,
          error: `timeout after ${PING_TIMEOUT_MS}ms`,
        };
      }
      // Twilio errors carry an HTTP `status` when the upstream rejected.
      // Anything without a status is treated as network failure.
      const httpStatus =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status: unknown }).status
          : undefined;
      if (typeof httpStatus === "number") {
        const message = error instanceof Error ? error.message : "";
        return {
          status: "degraded",
          latencyMs,
          error: `HTTP ${httpStatus}${message ? `: ${message}` : ""}`.trim(),
        };
      }
      return {
        status: "unhealthy",
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    }
  }
}
