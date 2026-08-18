import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { EmailService } from "./email-service";
import { SMSService } from "./sms-service";
import { billingService } from "./billing-service";
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

/**
 * Sample tracking links for the dashboard's test alert (LAUNCH_PLAN §6 R1).
 *
 * These previously pointed at `https://delayguard.app/test-tracking` — a
 * domain the project does not own. That URL is not internal: it renders as
 * the "Track your package" link inside a real email delivered to a real
 * merchant, so firing a test alert sent them to a stranger's expired site.
 *
 * `example.com` is reserved by RFC 2606, so it can never resolve to
 * somebody's real property — the same reasoning behind the `.example`
 * From-address fallback in email-service.ts. This is the *test* path only;
 * the production path builds real carrier links (see utils/tracking-url.ts)
 * and is guarded against `example.com` by delay-check's own tests.
 */
const sampleTrackingUrl = (trackingNumber: string): string =>
  `https://example.com/track/${trackingNumber}`;

const SAMPLE_DELAY_DETAILS: Record<TestAlertDelayType, DelayDetails> = {
  warehouse: {
    estimatedDelivery: "2026-05-22",
    trackingNumber: "TEST-WH-001",
    trackingUrl: sampleTrackingUrl("TEST-WH-001"),
    delayDays: 3,
    delayReason: "WAREHOUSE_DELAY",
  },
  carrier: {
    estimatedDelivery: "2026-05-25",
    trackingNumber: "1Z999TEST00001",
    trackingUrl: sampleTrackingUrl("1Z999TEST00001"),
    delayDays: 2,
    delayReason: "DELAYED_STATUS",
  },
  transit: {
    estimatedDelivery: "2026-05-28",
    trackingNumber: "1Z999TEST00002",
    trackingUrl: sampleTrackingUrl("1Z999TEST00002"),
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
      // SMS is a paid feature (Pro+). Gate on the shop's LIVE plan tier, not
      // just app_settings.sms_enabled — mirrors queue/processors/notification.ts.
      // A flag left TRUE after a downgrade from Pro would otherwise fire a real,
      // billable Twilio test SMS on the free tier (billing leak). getCurrentPlan
      // fails closed to "free", so a Shopify outage suppresses SMS rather than
      // leaking it. Only resolve the plan when SMS would actually fire.
      const plan = await billingService.getCurrentPlan(shopDomain);
      if (billingService.isSmsAllowed(plan)) {
        dispatches.push(
          this.smsService.sendDelaySMS(recipientPhone, orderInfo, delayDetails),
        );
        channelsAttempted.push("sms");
      } else {
        logger.warn(
          "Test-alert SMS suppressed: shop plan does not include SMS (Pro+ required)",
          { shopDomain, plan },
        );
      }
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
