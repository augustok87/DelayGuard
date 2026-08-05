/**
 * Access log for protected customer data — LAUNCH_PLAN §6 R7.
 *
 * Shopify's Level 2 protected-customer-data requirements (shopify.dev,
 * fetched 2026-08-05) include, verbatim: "Keep an access log to protected
 * customer data". DelayGuard requests Name, Address, Phone and Email, which
 * is Level 2, so this is mandatory — the Partner Dashboard refused approval
 * while the data-protection answer was "No", and it was right to: the
 * repo's `audit-logger.ts` was never wired into any data path.
 *
 * Two properties matter more than the shape of the row:
 *   1. It must never break a request. A logging failure that 500s a
 *      merchant's dashboard is worse than a missing log line.
 *   2. It must not itself become a PII store. The log records *who touched
 *      what, when* — shop, endpoint, outcome — never customer values.
 */
import { recordDataAccess } from "../../../src/services/access-log";
import { query } from "../../../src/database/connection";

jest.mock("../../../src/database/connection", () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("recordDataAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([] as never);
  });

  const entry = {
    shopDomain: "delayguard-dev.myshopify.com",
    userId: "42",
    path: "/api/orders",
    method: "GET",
    statusCode: 200,
  };

  it("writes one row naming the shop, endpoint and outcome", async() => {
    await recordDataAccess(entry);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO data_access_log");
    expect(params).toEqual([
      "delayguard-dev.myshopify.com",
      "42",
      "/api/orders",
      "GET",
      200,
    ]);
  });

  it("records the access even when the request failed", async() => {
    await recordDataAccess({ ...entry, statusCode: 500 });

    expect(mockQuery.mock.calls[0][1]).toContain(500);
  });

  it("tolerates a missing user id", async() => {
    await recordDataAccess({ ...entry, userId: undefined });

    expect(mockQuery.mock.calls[0][1]).toEqual([
      "delayguard-dev.myshopify.com",
      null,
      "/api/orders",
      "GET",
      200,
    ]);
  });

  // The whole point of the guard: an unavailable database must degrade the
  // log, not the request.
  it("never throws when the insert fails", async() => {
    mockQuery.mockRejectedValue(new Error("connection terminated"));

    await expect(recordDataAccess(entry)).resolves.toBeUndefined();
  });

  /** The persisted `path` parameter of the single insert. */
  const loggedPath = (): string => {
    const params = mockQuery.mock.calls[0][1];
    if (!params) throw new Error("expected the insert to receive parameters");
    return String(params[2]);
  };

  it("stores the path only, discarding any query string", async() => {
    // `?email=…` in a URL would otherwise turn the audit trail into a
    // second copy of the customer data it is supposed to be guarding.
    await recordDataAccess({ ...entry, path: "/api/orders?email=a@b.com" });

    expect(loggedPath()).toBe("/api/orders");
  });

  it("truncates an over-long path rather than failing the insert", async() => {
    await recordDataAccess({ ...entry, path: `/api/${"x".repeat(500)}` });

    expect(loggedPath().length).toBeLessThanOrEqual(255);
  });
});
