import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { EmailService } from "./email-service";
import { SMSService } from "./sms-service";
import {
  ShopNotFoundError,
  MerchantApiValidationError,
} from "./merchant-api-service";
import { OrderInfo, DelayDetails } from "../types";

export type TestAlertChannel = "email" | "sms";
export type TestAlertDelayType = "warehouse" | "carrier" | "transit";

export interface TestAlertRequest {
  delayType: TestAlertDelayType;
  channels?: TestAlertChannel[];
  recipientEmail?: string | null;
  recipientPhone?: string | null;
}

export interface TestAlertResult {
  channelsAttempted: TestAlertChannel[];
  recipientEmail: string | null;
  recipientPhone: string | null;
}

interface ShopJoinRow {
  merchant_email: string | null;
  merchant_phone: string | null;
  email_enabled: boolean | null;
  sms_enabled: boolean | null;
}

const SAMPLE_DELAY_DETAILS: Record<TestAlertDelayType, DelayDetails> = {
  warehouse: {
    estimatedDelivery: "2026-05-22",
    trackingNumber: "TEST-WH-001",
    trackingUrl: "https://delayguard.app/test-tracking",
    delayDays: 3,
    delayReason: "WAREHOUSE_DELAY",
  },
  carrier: {
    estimatedDelivery: "2026-05-25",
    trackingNumber: "1Z999TEST00001",
    trackingUrl: "https://delayguard.app/test-tracking",
    delayDays: 2,
    delayReason: "DELAYED_STATUS",
  },
  transit: {
    estimatedDelivery: "2026-05-28",
    trackingNumber: "1Z999TEST00002",
    trackingUrl: "https://delayguard.app/test-tracking",
    delayDays: 7,
    delayReason: "STUCK_IN_TRANSIT",
  },
};

function buildSampleOrderInfo(shopDomain: string): OrderInfo {
  return {
    id: "test-order-id",
    orderNumber: "TEST-001",
    customerName: "Sample Customer",
    customerEmail: "sample@example.com",
    customerPhone: "+15555550100",
    shopDomain,
    createdAt: new Date(),
  };
}

function isValidDelayType(value: unknown): value is TestAlertDelayType {
  return value === "warehouse" || value === "carrier" || value === "transit";
}

function isValidChannelArray(value: unknown): value is TestAlertChannel[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((c) => c === "email" || c === "sms");
}

/**
 * Dashboard-only test-alert dispatcher (Phase 2.1.e).
 *
 * Given a shop domain and a request payload, looks up the merchant's
 * configured contact (`shops.merchant_email` / `merchant_phone`) and
 * notification flags (`app_settings.email_enabled` / `sms_enabled`),
 * then dispatches a synthesized sample alert via EmailService /
 * SMSService directly. Returns the channels that were actually
 * dispatched so the dashboard can surface "your config is wired"
 * feedback.
 *
 * Dispatch is dry-run with respect to the alert pipeline: no DB writes,
 * no BullMQ enqueue, no real `delay_alerts` row. Per-request
 * `channels` and `recipientEmail` / `recipientPhone` overrides are
 * honored so the merchant can target a specific channel or address
 * during troubleshooting (deferred UI surfacing in Phase 2.1.f).
 */
export class TestAlertService {
  constructor(
    private emailService: EmailService,
    private smsService: SMSService,
  ) {}

  async dispatchTestAlert(
    shopDomain: string,
    req: TestAlertRequest,
  ): Promise<TestAlertResult> {
    if (!isValidDelayType(req.delayType)) {
      throw new MerchantApiValidationError(
        "Invalid delayType (must be 'warehouse', 'carrier', or 'transit')",
        "INVALID_DELAY_TYPE",
      );
    }
    if (req.channels !== undefined && !isValidChannelArray(req.channels)) {
      throw new MerchantApiValidationError(
        "channels must be a non-empty array of 'email' and/or 'sms'",
        "INVALID_CHANNELS",
      );
    }

    const rows = await query<ShopJoinRow>(
      `SELECT s.merchant_email,
              s.merchant_phone,
              ast.email_enabled,
              ast.sms_enabled
         FROM shops s
    LEFT JOIN app_settings ast ON ast.shop_id = s.id
        WHERE s.shop_domain = $1`,
      [shopDomain],
    );

    if (rows.length === 0) {
      throw new ShopNotFoundError(shopDomain);
    }

    const row = rows[0];
    // LEFT JOIN: app_settings row may be missing; mirror schema defaults
    // (email_enabled DEFAULT TRUE, sms_enabled DEFAULT FALSE).
    const emailEnabled = row.email_enabled ?? true;
    const smsEnabled = row.sms_enabled ?? false;

    const recipientEmail = req.recipientEmail ?? row.merchant_email;
    const recipientPhone = req.recipientPhone ?? row.merchant_phone;

    const requested: TestAlertChannel[] = req.channels ?? ["email", "sms"];
    const orderInfo = buildSampleOrderInfo(shopDomain);
    const delayDetails = SAMPLE_DELAY_DETAILS[req.delayType];

    const channelsAttempted: TestAlertChannel[] = [];
    const dispatches: Promise<void>[] = [];

    if (requested.includes("email") && emailEnabled && recipientEmail) {
      dispatches.push(
        this.emailService.sendDelayEmail(recipientEmail, orderInfo, delayDetails),
      );
      channelsAttempted.push("email");
    }
    if (requested.includes("sms") && smsEnabled && recipientPhone) {
      dispatches.push(
        this.smsService.sendDelaySMS(recipientPhone, orderInfo, delayDetails),
      );
      channelsAttempted.push("sms");
    }

    await Promise.all(dispatches);

    logger.info("Test alert dispatched", {
      shopDomain,
      delayType: req.delayType,
      channelsAttempted,
    });

    return { channelsAttempted, recipientEmail, recipientPhone };
  }
}
