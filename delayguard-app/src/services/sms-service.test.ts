/**
 * SMSService.ping() — sibling tests for the health-probe entrypoint.
 *
 * Scope is intentionally limited to ping() per Wave 2.3. The broader Wave 4
 * sibling-test gap for sendDelaySMS is tracked separately and not closed here.
 */

const twilioMock = jest.fn();
jest.mock("twilio", () => twilioMock);

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
