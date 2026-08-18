/**
 * TestAlertService — sibling tests for Phase 2.1.e (test-alert endpoint)
 *
 * Verifies the dashboard-only "fire a sample alert to my own contact"
 * path. Tests the dispatch fan-out (email+sms gating against
 * app_settings flags + presence of merchant contact + per-request
 * channel-picker + per-request recipient-override).
 *
 * Note: this slice does NOT modify EmailService / SMSService /
 * NotificationService. Test-alert dispatch goes directly through
 * EmailService.sendDelayEmail and SMSService.sendDelaySMS, and returns
 * { channelsAttempted } as a no-throw success signal (not delivery
 * proof — that requires the SendGrid Event Webhook, which lives in
 * sendgrid-webhook.ts and is correlated post-hoc).
 */

import {
  TestAlertService,
  TestAlertChannel,
  TestAlertDelayType,
} from "./test-alert-service";
import { EmailService } from "./email-service";
import { SMSService } from "./sms-service";
import {
  ShopNotFoundError,
  MerchantApiValidationError,
} from "./merchant-api-service";

jest.mock("../database/connection");
import { query } from "../database/connection";
const mockQuery = query as jest.MockedFunction<typeof query>;

jest.mock("../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// SMS is a paid feature (Pro+). The service must gate the SMS channel on the
// shop's LIVE plan tier (mirroring queue/processors/notification.ts), not just
// on the app_settings.sms_enabled flag. Default the mock to an SMS-eligible
// plan so the pre-existing dispatch tests keep exercising the SMS path.
jest.mock("./billing-service", () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue("pro"),
    isSmsAllowed: jest.fn((tier: string) => tier === "pro" || tier === "enterprise"),
  },
}));
import { billingService } from "./billing-service";
const mockGetCurrentPlan = billingService.getCurrentPlan as jest.MockedFunction<
  typeof billingService.getCurrentPlan
>;
const mockIsSmsAllowed = billingService.isSmsAllowed as jest.MockedFunction<
  typeof billingService.isSmsAllowed
>;

describe("TestAlertService.dispatchTestAlert", () => {
  const shopDomain = "test-store.myshopify.com";
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SMSService>;
  let service: TestAlertService;

  // Helper: queue the JOIN row that the service expects from the
  // single SELECT against shops + app_settings.
  const mockShopRow = (overrides: Partial<{
    merchant_email: string | null;
    merchant_phone: string | null;
    email_enabled: boolean | null;
    sms_enabled: boolean | null;
  }> = {}): void => {
    mockQuery.mockResolvedValueOnce([
      {
        merchant_email: "merchant@example.com",
        merchant_phone: "+15555550123",
        email_enabled: true,
        sms_enabled: true,
        ...overrides,
      },
    ]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    emailService = {
      sendDelayEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;
    smsService = {
      sendDelaySMS: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SMSService>;
    service = new TestAlertService(emailService, smsService);
  });

  it("dispatches both channels when both enabled and both merchant contacts present", async() => {
    mockShopRow();

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual(["email", "sms"]);
    expect(result.recipientEmail).toBe("merchant@example.com");
    expect(result.recipientPhone).toBe("+15555550123");
    expect(emailService.sendDelayEmail).toHaveBeenCalledTimes(1);
    expect(smsService.sendDelaySMS).toHaveBeenCalledTimes(1);
    // Email recipient is the merchant, not the synthesized customer
    expect(emailService.sendDelayEmail).toHaveBeenCalledWith(
      "merchant@example.com",
      expect.objectContaining({ shopDomain }),
      expect.objectContaining({ delayReason: "WAREHOUSE_DELAY" }),
    );
    expect(smsService.sendDelaySMS).toHaveBeenCalledWith(
      "+15555550123",
      expect.objectContaining({ shopDomain }),
      expect.objectContaining({ delayReason: "WAREHOUSE_DELAY" }),
    );
  });

  it("skips email channel when email_enabled=false (per-channel flag honored)", async() => {
    mockShopRow({ email_enabled: false });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "carrier",
    });

    expect(result.channelsAttempted).toEqual(["sms"]);
    expect(emailService.sendDelayEmail).not.toHaveBeenCalled();
    expect(smsService.sendDelaySMS).toHaveBeenCalledTimes(1);
  });

  it("skips sms channel when sms_enabled=false (per-channel flag honored)", async() => {
    mockShopRow({ sms_enabled: false });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "transit",
    });

    expect(result.channelsAttempted).toEqual(["email"]);
    expect(emailService.sendDelayEmail).toHaveBeenCalledTimes(1);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("attempts no channels when both flags are off (returns success with empty list)", async() => {
    mockShopRow({ email_enabled: false, sms_enabled: false });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual([]);
    expect(emailService.sendDelayEmail).not.toHaveBeenCalled();
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("honors channels: ['email'] request even when sms_enabled=true", async() => {
    mockShopRow();
    const channels: TestAlertChannel[] = ["email"];

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      channels,
    });

    expect(result.channelsAttempted).toEqual(["email"]);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("honors channels: ['sms'] request even when email_enabled=true", async() => {
    mockShopRow();
    const channels: TestAlertChannel[] = ["sms"];

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      channels,
    });

    expect(result.channelsAttempted).toEqual(["sms"]);
    expect(emailService.sendDelayEmail).not.toHaveBeenCalled();
  });

  it("uses recipientEmail override instead of merchant_email when provided", async() => {
    mockShopRow();

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      recipientEmail: "support@override.com",
    });

    expect(result.recipientEmail).toBe("support@override.com");
    expect(emailService.sendDelayEmail).toHaveBeenCalledWith(
      "support@override.com",
      expect.anything(),
      expect.anything(),
    );
  });

  it("uses recipientPhone override instead of merchant_phone when provided", async() => {
    mockShopRow();

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      recipientPhone: "+15555559999",
    });

    expect(result.recipientPhone).toBe("+15555559999");
    expect(smsService.sendDelaySMS).toHaveBeenCalledWith(
      "+15555559999",
      expect.anything(),
      expect.anything(),
    );
  });

  it("skips email when merchant_email is null and no override is provided", async() => {
    mockShopRow({ merchant_email: null });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual(["sms"]);
    expect(emailService.sendDelayEmail).not.toHaveBeenCalled();
  });

  it("skips sms when merchant_phone is null and no override is provided", async() => {
    mockShopRow({ merchant_phone: null });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual(["email"]);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("throws ShopNotFoundError when shop is not in the database", async() => {
    mockQuery.mockResolvedValueOnce([]);

    await expect(
      service.dispatchTestAlert(shopDomain, { delayType: "warehouse" }),
    ).rejects.toThrow(ShopNotFoundError);
    expect(emailService.sendDelayEmail).not.toHaveBeenCalled();
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("throws MerchantApiValidationError when delayType is invalid", async() => {
    await expect(
      service.dispatchTestAlert(shopDomain, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delayType: "bogus" as any,
      }),
    ).rejects.toThrow(MerchantApiValidationError);
    // Validation must short-circuit before the DB read
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("throws MerchantApiValidationError when channels is an empty array", async() => {
    await expect(
      service.dispatchTestAlert(shopDomain, {
        delayType: "warehouse",
        channels: [],
      }),
    ).rejects.toThrow(MerchantApiValidationError);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("synthesizes a distinct delayReason per delayType", async() => {
    mockShopRow();
    await service.dispatchTestAlert(shopDomain, { delayType: "warehouse" });
    mockShopRow();
    await service.dispatchTestAlert(shopDomain, { delayType: "carrier" });
    mockShopRow();
    await service.dispatchTestAlert(shopDomain, { delayType: "transit" });

    const calls = emailService.sendDelayEmail.mock.calls.map((c) => c[2].delayReason);
    expect(calls).toEqual(["WAREHOUSE_DELAY", "DELAYED_STATUS", "STUCK_IN_TRANSIT"]);
  });

  // --- SMS plan gating (billing-leak defense, mirrors notification.ts) ---

  it("suppresses SMS when the shop's live plan does not include SMS, even if sms_enabled=true (stale-flag billing leak)", async() => {
    // Realistic scenario: shop was Pro (enabled SMS), downgraded to free, but
    // app_settings.sms_enabled is still TRUE. Default-channel dispatch must NOT
    // fire a billable Twilio SMS off-plan.
    mockShopRow({ sms_enabled: true });
    mockGetCurrentPlan.mockResolvedValueOnce("free");

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(mockGetCurrentPlan).toHaveBeenCalledWith(shopDomain);
    expect(result.channelsAttempted).toEqual(["email"]);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("suppresses SMS on the free plan even when channels: ['sms'] is explicitly requested", async() => {
    mockShopRow({ sms_enabled: true });
    mockGetCurrentPlan.mockResolvedValueOnce("free");
    const channels: TestAlertChannel[] = ["sms"];

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      channels,
    });

    expect(result.channelsAttempted).toEqual([]);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  it("dispatches SMS on the enterprise plan (isSmsAllowed=true)", async() => {
    mockShopRow({ sms_enabled: true });
    mockGetCurrentPlan.mockResolvedValueOnce("enterprise");

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual(["email", "sms"]);
    expect(smsService.sendDelaySMS).toHaveBeenCalledTimes(1);
  });

  it("does NOT resolve the plan when SMS would not fire anyway (email-only request)", async() => {
    // Optimization guard, matching notification.ts: avoid a billing GraphQL
    // lookup on every email-only test-alert.
    mockShopRow();
    const channels: TestAlertChannel[] = ["email"];

    await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
      channels,
    });

    expect(mockGetCurrentPlan).not.toHaveBeenCalled();
  });

  it("does NOT resolve the plan when sms_enabled=false (no SMS intent)", async() => {
    mockShopRow({ sms_enabled: false });

    await service.dispatchTestAlert(shopDomain, { delayType: "warehouse" });

    expect(mockGetCurrentPlan).not.toHaveBeenCalled();
    expect(mockIsSmsAllowed).not.toHaveBeenCalled();
  });

  it("defaults email_enabled=TRUE / sms_enabled=FALSE when app_settings row is missing (LEFT JOIN nulls)", async() => {
    // app_settings row absent → LEFT JOIN returns null for both flags;
    // service must mirror schema defaults (email_enabled DEFAULT TRUE,
    // sms_enabled DEFAULT FALSE).
    mockShopRow({ email_enabled: null, sms_enabled: null });

    const result = await service.dispatchTestAlert(shopDomain, {
      delayType: "warehouse",
    });

    expect(result.channelsAttempted).toEqual(["email"]);
    expect(emailService.sendDelayEmail).toHaveBeenCalledTimes(1);
    expect(smsService.sendDelaySMS).not.toHaveBeenCalled();
  });

  describe("sample tracking URL (LAUNCH_PLAN §6 R1)", () => {
    // The sample details shipped `https://delayguard.app/test-tracking` —
    // a domain the project does not own (it was registered 2026-02-06 by
    // an unidentified party and serves an expired Squarespace site). This
    // URL is not internal: it renders as the "Track your package" link in
    // a real email delivered to a real merchant, so clicking the test
    // alert sent them to a stranger's website.
    //
    // Reserved-domain placeholders only, per RFC 2606 — the same rule
    // that put the From-address fallback on `.example`.
    const delayTypes: TestAlertDelayType[] = [
      "warehouse",
      "carrier",
      "transit",
    ];

    it.each(delayTypes)(
      "%s sample does not link to a domain we do not own",
      async(delayType) => {
        mockShopRow({});

        await service.dispatchTestAlert(shopDomain, { delayType });

        const [, , delayDetails] = (
          emailService.sendDelayEmail as jest.Mock
        ).mock.calls[0];
        expect(delayDetails.trackingUrl).not.toContain("delayguard.app");
      },
    );

    it("links each sample to a reserved example domain", async() => {
      mockShopRow({});

      await service.dispatchTestAlert(shopDomain, { delayType: "carrier" });

      const [, , delayDetails] = (emailService.sendDelayEmail as jest.Mock)
        .mock.calls[0];
      expect(delayDetails.trackingUrl).toMatch(
        /^https:\/\/example\.com\/track\//,
      );
    });
  });
});
