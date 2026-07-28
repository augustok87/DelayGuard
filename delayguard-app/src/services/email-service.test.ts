/**
 * EmailService — sibling tests for ping() (Wave 2.3) and sendDelayEmail (Wave 4.1).
 *
 * Mocking convention: @sendgrid/mail is mocked at the SDK level. The service is a
 * thin wrapper around sgMail.send — there is no finer-grained seam to mock.
 * tests.md "mock at service-method level" applies to callers OF EmailService, not
 * here (covered by notification-service tests).
 */

import { EmailService } from "./email-service";
import * as sgMail from "@sendgrid/mail";
import type { OrderInfo, DelayDetails } from "../types";

jest.mock("@sendgrid/mail", () => ({ setApiKey: jest.fn(), send: jest.fn() }));

const sendMock = sgMail.send as unknown as jest.Mock;

function makeOrderInfo(overrides: Partial<OrderInfo> = {}): OrderInfo {
  return {
    id: "order-shopify-001",
    orderNumber: "1001",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    shopDomain: "test-shop.myshopify.com",
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

function makeDelayDetails(
  overrides: Partial<DelayDetails> = {},
): DelayDetails {
  return {
    estimatedDelivery: "2026-05-12",
    trackingNumber: "1Z999AA1234567890",
    trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA1234567890",
    delayDays: 3,
    delayReason: "Weather delay",
    ...overrides,
  };
}

describe("EmailService.ping", () => {
  let emailService: EmailService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
    emailService = new EmailService("test-sendgrid-key");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns status="healthy" with latencyMs on upstream 200', async() => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    const result = await emailService.ping();

    expect(result.status).toBe("healthy");
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("targets the lightest SendGrid liveness endpoint with the API key in the Authorization header", async() => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    await emailService.ping();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/user/profile");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-sendgrid-key",
    });
  });

  it("passes an AbortSignal to fetch (regression guard against timeout being silently disabled)", async() => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: "OK" });

    await emailService.ping();

    const init = fetchMock.mock.calls[0][1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });

  it('returns status="degraded" with HTTP status in error on upstream non-2xx', async() => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const result = await emailService.ping();

    expect(result.status).toBe("degraded");
    if (result.status === "degraded") {
      expect(result.error).toMatch(/HTTP 401/);
      expect(typeof result.latencyMs).toBe("number");
    }
  });

  it('returns status="unhealthy" with /timeout/i error when AbortController fires at 5s', async() => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const pingPromise = emailService.ping();
    await jest.advanceTimersByTimeAsync(5000);
    const result = await pingPromise;

    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.error).toMatch(/timeout/i);
    }
  });

  it('returns status="unhealthy" on network failure (fetch rejects)', async() => {
    fetchMock.mockRejectedValue(new Error("fetch failed: ECONNREFUSED"));

    const result = await emailService.ping();

    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.error).toMatch(/ECONNREFUSED/);
    }
  });

  it("never throws — always resolves to a PingResult across every failure path", async() => {
    fetchMock.mockRejectedValue("plain-string-rejection");
    await expect(emailService.ping()).resolves.toBeDefined();
    const result = await emailService.ping();
    expect(result.status).toBe("unhealthy");
  });
});

describe("EmailService.sendDelayEmail", () => {
  let emailService: EmailService;

  beforeEach(() => {
    sendMock.mockReset();
    emailService = new EmailService("test-sendgrid-key");
  });

  it("calls @sendgrid/mail.send with the canonical envelope and every dynamic-data field (v1.19 field-population rule)", async() => {
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    const orderInfo = makeOrderInfo();
    const delayDetails = makeDelayDetails();

    await emailService.sendDelayEmail(
      orderInfo.customerEmail!,
      orderInfo,
      delayDetails,
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@example.com",
        from: "noreply@delayguard.app",
        templateId: "d-delay-notification-template",
        dynamicTemplateData: expect.objectContaining({
          customerName: "Jane Doe",
          orderNumber: "1001",
          newDeliveryDate: "2026-05-12",
          trackingNumber: "1Z999AA1234567890",
          trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA1234567890",
          delayDays: 3,
          delayReason: "Weather delay",
        }),
      }),
    );
  });

  it("routes the recipient address from the email argument (not from orderInfo.customerEmail) — regression guard for callers that pass an override", async() => {
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    const orderInfo = makeOrderInfo({ customerEmail: "stale@example.com" });

    await emailService.sendDelayEmail(
      "override@example.com",
      orderInfo,
      makeDelayDetails(),
    );

    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("override@example.com");
  });

  it("propagates a wrapped Error when sgMail.send rejects (BullMQ retry must see the failure)", async() => {
    sendMock.mockRejectedValue(
      new Error("ECONNRESET: connection reset by peer"),
    );

    await expect(
      emailService.sendDelayEmail(
        "jane@example.com",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send email/);
  });

  it("propagates a wrapped Error when sgMail.send rejects with a 401 auth failure (must not be swallowed)", async() => {
    sendMock.mockRejectedValue(
      Object.assign(new Error("Unauthorized"), { code: 401 }),
    );

    await expect(
      emailService.sendDelayEmail(
        "jane@example.com",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send email/);
  });

  it("propagates a wrapped Error even when sgMail.send rejects with a non-Error value (plain string)", async() => {
    sendMock.mockRejectedValue("plain-string-rejection");

    await expect(
      emailService.sendDelayEmail(
        "jane@example.com",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send email/);
  });

  it("interpolates delayDays = 0 without dropping it (zero-value regression guard)", async() => {
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo(),
      makeDelayDetails({ delayDays: 0 }),
    );

    const dynamicData = sendMock.mock.calls[0][0].dynamicTemplateData;
    expect(dynamicData).toHaveProperty("delayDays", 0);
  });

  it("passes the empty string for missing optional delay fields rather than dropping the key", async() => {
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    const delayDetails = makeDelayDetails({ delayReason: "" });

    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo(),
      delayDetails,
    );

    const dynamicData = sendMock.mock.calls[0][0].dynamicTemplateData;
    expect(dynamicData).toHaveProperty("delayReason", "");
  });

  it("does not call @sendgrid/mail.send more than once per invocation (idempotency / no-retry-inside-service)", async() => {
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);

    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo(),
      makeDelayDetails(),
    );

    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe("EmailService — SENDGRID_FROM_EMAIL sender identity (Launch WS-E, task E1)", () => {
  // SendGrid rejects any send whose `from` is not a verified Sender Identity.
  // The address was hardcoded to noreply@delayguard.app, but that domain is
  // registered to a lapsed Squarespace site and cannot be domain-authenticated,
  // so the deployment has to be able to point at whatever sender is actually
  // verified (Single Sender Verification) without a code change.
  let emailService: EmailService;
  const originalFrom = process.env.SENDGRID_FROM_EMAIL;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    emailService = new EmailService("test-sendgrid-key");
  });

  afterEach(() => {
    if (originalFrom === undefined) {
      delete process.env.SENDGRID_FROM_EMAIL;
    } else {
      process.env.SENDGRID_FROM_EMAIL = originalFrom;
    }
  });

  it("sends from SENDGRID_FROM_EMAIL when set", async() => {
    process.env.SENDGRID_FROM_EMAIL = "augustok87@gmail.com";
    const orderInfo = makeOrderInfo();

    await emailService.sendDelayEmail(
      orderInfo.customerEmail!,
      orderInfo,
      makeDelayDetails(),
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "augustok87@gmail.com" }),
    );
  });

  it("falls back to the historical noreply@delayguard.app when unset", async() => {
    delete process.env.SENDGRID_FROM_EMAIL;
    const orderInfo = makeOrderInfo();

    await emailService.sendDelayEmail(
      orderInfo.customerEmail!,
      orderInfo,
      makeDelayDetails(),
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@delayguard.app" }),
    );
  });

  it("ignores a whitespace-only SENDGRID_FROM_EMAIL", async() => {
    process.env.SENDGRID_FROM_EMAIL = "   ";
    const orderInfo = makeOrderInfo();

    await emailService.sendDelayEmail(
      orderInfo.customerEmail!,
      orderInfo,
      makeDelayDetails(),
    );

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "noreply@delayguard.app" }),
    );
  });
});

describe("EmailService — SENDGRID_DELAY_TEMPLATE_ID resolution (Launch WS-E, task E1)", () => {
  let emailService: EmailService;
  const originalTemplateId = process.env.SENDGRID_DELAY_TEMPLATE_ID;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    emailService = new EmailService("test-sendgrid-key");
  });

  afterEach(() => {
    if (originalTemplateId === undefined) {
      delete process.env.SENDGRID_DELAY_TEMPLATE_ID;
    } else {
      process.env.SENDGRID_DELAY_TEMPLATE_ID = originalTemplateId;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("uses the template ID from SENDGRID_DELAY_TEMPLATE_ID when set", async() => {
    process.env.SENDGRID_DELAY_TEMPLATE_ID = "d-real123abc";

    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo(),
      makeDelayDetails(),
    );

    expect(sendMock.mock.calls[0][0].templateId).toBe("d-real123abc");
  });

  it("falls back to the placeholder template ID outside production when unset", async() => {
    delete process.env.SENDGRID_DELAY_TEMPLATE_ID;

    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo(),
      makeDelayDetails(),
    );

    expect(sendMock.mock.calls[0][0].templateId).toBe(
      "d-delay-notification-template",
    );
  });

  it("fails loudly in production when SENDGRID_DELAY_TEMPLATE_ID is unset — no email is sent", async() => {
    delete process.env.SENDGRID_DELAY_TEMPLATE_ID;
    process.env.NODE_ENV = "production";

    await expect(
      emailService.sendDelayEmail(
        "jane@example.com",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/SENDGRID_DELAY_TEMPLATE_ID/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("treats a whitespace-only SENDGRID_DELAY_TEMPLATE_ID as unset in production", async() => {
    process.env.SENDGRID_DELAY_TEMPLATE_ID = "   ";
    process.env.NODE_ENV = "production";

    await expect(
      emailService.sendDelayEmail(
        "jane@example.com",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/SENDGRID_DELAY_TEMPLATE_ID/);
  });
});

describe("EmailService — recipientName routing (Launch WS-E, task E3)", () => {
  let emailService: EmailService;

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue([{ statusCode: 202 }, {}]);
    emailService = new EmailService("test-sendgrid-key");
  });

  it("defaults dynamicTemplateData.recipientName to the order's customerName", async() => {
    await emailService.sendDelayEmail(
      "jane@example.com",
      makeOrderInfo({ customerName: "Jane Doe" }),
      makeDelayDetails(),
    );

    const dynamicData = sendMock.mock.calls[0][0].dynamicTemplateData;
    expect(dynamicData.recipientName).toBe("Jane Doe");
    expect(dynamicData.customerName).toBe("Jane Doe");
  });

  it("uses options.recipientName for merchant-routed emails while preserving customerName (v1.19 field-population rule)", async() => {
    await emailService.sendDelayEmail(
      "mary@merchant-store.com",
      makeOrderInfo({ customerName: "Jane Doe" }),
      makeDelayDetails(),
      { recipientName: "Mary Merchant" },
    );

    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("mary@merchant-store.com");
    expect(call.dynamicTemplateData.recipientName).toBe("Mary Merchant");
    expect(call.dynamicTemplateData.customerName).toBe("Jane Doe");
  });
});
