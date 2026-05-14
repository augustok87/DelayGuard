import * as sgMail from "@sendgrid/mail";
import { OrderInfo, DelayDetails } from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";

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
  ): Promise<void> {
    const msg = {
      to: email,
      from: "noreply@delayguard.app",
      templateId: "d-delay-notification-template",
      dynamicTemplateData: {
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
