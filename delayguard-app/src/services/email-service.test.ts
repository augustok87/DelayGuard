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
    trackingUrl: "https://tracking.example.com/1Z999AA1234567890",
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
          trackingUrl: "https://tracking.example.com/1Z999AA1234567890",
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
