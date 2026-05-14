const twilio = require("twilio");
import { OrderInfo, DelayDetails } from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";

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
  ): Promise<void> {
    const message = `Hi ${orderInfo.customerName}, your order #${orderInfo.orderNumber} is delayed. New delivery: ${delayDetails.estimatedDelivery}. Track: ${delayDetails.trackingUrl}`;

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
