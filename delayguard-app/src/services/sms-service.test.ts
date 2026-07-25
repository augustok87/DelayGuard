/**
 * SMSService — sibling tests for ping() (Wave 2.3) and sendDelaySMS (Wave 4.1).
 *
 * Mocking convention: twilio is mocked at the SDK level. The service is a thin
 * wrapper around `client.messages.create` — there is no finer-grained seam.
 * tests.md "mock at service-method level" applies to callers OF SMSService.
 */

import type { OrderInfo, DelayDetails } from "../types";

const twilioMock = jest.fn();
jest.mock("twilio", () => twilioMock);

function makeOrderInfo(overrides: Partial<OrderInfo> = {}): OrderInfo {
  return {
    id: "order-shopify-001",
    orderNumber: "1001",
    customerName: "Jane Doe",
    customerPhone: "+15558675309",
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

describe("SMSService.ping", () => {
  let SMSService: typeof import("./sms-service").SMSService;
  let smsService: import("./sms-service").SMSService;
  let accountsFetchMock: jest.Mock;
  let accountsFactory: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    accountsFetchMock = jest.fn();
    accountsFactory = jest.fn().mockReturnValue({ fetch: accountsFetchMock });
    twilioMock.mockReturnValue({
      messages: { create: jest.fn() },
      api: { v2010: { accounts: accountsFactory } },
    });

    // Re-require after mock setup
    SMSService = require("./sms-service").SMSService;
    smsService = new SMSService("AC_TEST_SID", "auth-token", "+15551234567");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns status="healthy" with latencyMs when Twilio account fetch resolves', async() => {
    accountsFetchMock.mockResolvedValue({
      sid: "AC_TEST_SID",
      status: "active",
    });

    const result = await smsService.ping();

    expect(result.status).toBe("healthy");
    expect(typeof result.latencyMs).toBe("number");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("calls Twilio account fetch for the configured accountSid (canonical liveness probe)", async() => {
    accountsFetchMock.mockResolvedValue({ sid: "AC_TEST_SID" });

    await smsService.ping();

    expect(accountsFactory).toHaveBeenCalledWith("AC_TEST_SID");
    expect(accountsFetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns status="degraded" with HTTP status in error when Twilio returns a non-2xx', async() => {
    const twilioError = Object.assign(new Error("Authentication Error"), {
      status: 401,
      code: 20003,
    });
    accountsFetchMock.mockRejectedValue(twilioError);

    const result = await smsService.ping();

    expect(result.status).toBe("degraded");
    if (result.status === "degraded") {
      expect(result.error).toMatch(/HTTP 401/);
      expect(typeof result.latencyMs).toBe("number");
    }
  });

  it('returns status="unhealthy" with /timeout/i error after 5s when Twilio call never resolves', async() => {
    jest.useFakeTimers();
    accountsFetchMock.mockImplementation(() => new Promise(() => {}));

    const pingPromise = smsService.ping();
    await jest.advanceTimersByTimeAsync(5000);
    const result = await pingPromise;

    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.error).toMatch(/timeout/i);
    }
  });

  it('returns status="unhealthy" on network failure (Twilio SDK throws without a status)', async() => {
    accountsFetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const result = await smsService.ping();

    expect(result.status).toBe("unhealthy");
    if (result.status === "unhealthy") {
      expect(result.error).toMatch(/ECONNREFUSED/);
    }
  });

  it("never throws — always resolves to a PingResult across every failure path", async() => {
    accountsFetchMock.mockRejectedValue("plain-string-rejection");
    await expect(smsService.ping()).resolves.toBeDefined();
    const result = await smsService.ping();
    expect(result.status).toBe("unhealthy");
  });
});

describe("SMSService.sendDelaySMS", () => {
  let SMSService: typeof import("./sms-service").SMSService;
  let smsService: import("./sms-service").SMSService;
  let messagesCreateMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    messagesCreateMock = jest.fn();
    twilioMock.mockReturnValue({
      messages: { create: messagesCreateMock },
      api: { v2010: { accounts: jest.fn() } },
    });
    SMSService = require("./sms-service").SMSService;
    smsService = new SMSService("AC_TEST_SID", "auth-token", "+15551234567");
  });

  it("calls client.messages.create with the canonical envelope (v1.19 field-population rule)", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST", status: "queued" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails(),
    );

    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
    expect(messagesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "+15558675309",
        from: "+15551234567",
        body: expect.any(String),
      }),
    );
  });

  it("interpolates customerName into the body (regression guard — one assertion per field)", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo({ customerName: "Carlos Vega" }),
      makeDelayDetails(),
    );

    expect(messagesCreateMock.mock.calls[0][0].body).toContain("Carlos Vega");
  });

  it("interpolates orderNumber into the body", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo({ orderNumber: "9042" }),
      makeDelayDetails(),
    );

    expect(messagesCreateMock.mock.calls[0][0].body).toContain("#9042");
  });

  it("interpolates estimatedDelivery into the body", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails({ estimatedDelivery: "2026-06-30" }),
    );

    expect(messagesCreateMock.mock.calls[0][0].body).toContain("2026-06-30");
  });

  it("interpolates trackingUrl into the body", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails({
        trackingUrl: "https://track.example.com/abc123",
      }),
    );

    expect(messagesCreateMock.mock.calls[0][0].body).toContain(
      "https://track.example.com/abc123",
    );
  });

  it("routes the recipient phone from the phone argument (not from orderInfo.customerPhone) — override regression guard", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });
    const orderInfo = makeOrderInfo({ customerPhone: "+15550000000" });

    await smsService.sendDelaySMS(
      "+15558675309",
      orderInfo,
      makeDelayDetails(),
    );

    expect(messagesCreateMock.mock.calls[0][0].to).toBe("+15558675309");
  });

  it("propagates a wrapped Error when client.messages.create rejects (BullMQ retry must see the failure)", async() => {
    messagesCreateMock.mockRejectedValue(
      Object.assign(new Error("Invalid 'To' Phone Number"), { code: 21211 }),
    );

    await expect(
      smsService.sendDelaySMS(
        "+15558675309",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send SMS/);
  });

  it("propagates a wrapped Error on Twilio auth failure (must not be swallowed)", async() => {
    messagesCreateMock.mockRejectedValue(
      Object.assign(new Error("Authentication Error"), {
        status: 401,
        code: 20003,
      }),
    );

    await expect(
      smsService.sendDelaySMS(
        "+15558675309",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send SMS/);
  });

  it("propagates a wrapped Error even when client.messages.create rejects with a non-Error value", async() => {
    messagesCreateMock.mockRejectedValue("plain-string-rejection");

    await expect(
      smsService.sendDelaySMS(
        "+15558675309",
        makeOrderInfo(),
        makeDelayDetails(),
      ),
    ).rejects.toThrow(/Failed to send SMS/);
  });

  it("does not call client.messages.create more than once per invocation (idempotency / no-retry-inside-service)", async() => {
    messagesCreateMock.mockResolvedValue({ sid: "SM_TEST" });

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails(),
    );

    expect(messagesCreateMock).toHaveBeenCalledTimes(1);
  });
});

describe("SMSService.sendDelaySMS — merchant audience (Launch WS-E, task E3)", () => {
  let SMSService: typeof import("./sms-service").SMSService;
  let smsService: import("./sms-service").SMSService;
  let messagesCreateMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    messagesCreateMock = jest.fn().mockResolvedValue({ sid: "SM_TEST" });
    twilioMock.mockReturnValue({
      messages: { create: messagesCreateMock },
      api: { v2010: { accounts: jest.fn() } },
    });
    SMSService = require("./sms-service").SMSService;
    smsService = new SMSService("AC_TEST_SID", "auth-token", "+15551234567");
  });

  it("defaults to the customer-facing copy ('Hi <customerName>, your order …') when no audience is given", async() => {
    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo({ customerName: "Jane Doe" }),
      makeDelayDetails(),
    );

    expect(messagesCreateMock.mock.calls[0][0].body).toContain(
      "Hi Jane Doe, your order",
    );
  });

  it("merchant audience: sends operational copy naming the customer's order, NOT 'your order' second-person copy", async() => {
    await smsService.sendDelaySMS(
      "+15550001111",
      makeOrderInfo({ customerName: "Jane Doe", orderNumber: "1001" }),
      makeDelayDetails({ delayReason: "WAREHOUSE_DELAY" }),
      { audience: "merchant" },
    );

    const body = messagesCreateMock.mock.calls[0][0].body;
    expect(body).toContain("#1001");
    expect(body).toContain("Jane Doe");
    expect(body).toContain("WAREHOUSE_DELAY");
    expect(body).not.toContain("your order");
  });

  it("merchant audience: still interpolates estimatedDelivery and trackingUrl (v1.19 field-population rule)", async() => {
    await smsService.sendDelaySMS(
      "+15550001111",
      makeOrderInfo(),
      makeDelayDetails({
        estimatedDelivery: "2026-06-30",
        trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA1234567890",
      }),
      { audience: "merchant" },
    );

    const body = messagesCreateMock.mock.calls[0][0].body;
    expect(body).toContain("2026-06-30");
    expect(body).toContain(
      "https://www.ups.com/track?tracknum=1Z999AA1234567890",
    );
  });

  it("explicit customer audience matches the default copy (regression guard)", async() => {
    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails(),
      { audience: "customer" },
    );
    const explicitBody = messagesCreateMock.mock.calls[0][0].body;

    await smsService.sendDelaySMS(
      "+15558675309",
      makeOrderInfo(),
      makeDelayDetails(),
    );
    const defaultBody = messagesCreateMock.mock.calls[1][0].body;

    expect(explicitBody).toBe(defaultBody);
  });
});
