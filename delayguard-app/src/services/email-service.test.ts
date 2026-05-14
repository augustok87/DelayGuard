/**
 * EmailService.ping() — sibling tests for the health-probe entrypoint.
 *
 * Scope is intentionally limited to ping() per Wave 2.3. The broader Wave 4
 * sibling-test gap for sendDelayEmail is tracked separately and not closed here.
 */

import { EmailService } from "./email-service";

jest.mock("@sendgrid/mail", () => ({ setApiKey: jest.fn(), send: jest.fn() }));

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
