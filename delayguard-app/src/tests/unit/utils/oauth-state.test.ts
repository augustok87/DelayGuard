/**
 * OAuth state-token + callback-HMAC helpers — WS-C C3.
 *
 * TDD-first per .claude/rules/tests.md. The state cookie is
 * self-authenticating (HMAC over nonce + expiry) so no server-side
 * session store or Koa app.keys is required. verifyOAuthQueryHmac
 * implements Shopify's OAuth callback query signing (sorted key=value
 * pairs, hmac param excluded, HMAC-SHA256 hex with the API secret).
 */
import crypto from "crypto";
import {
  buildStateCookieValue,
  verifyStateCookie,
  verifyOAuthQueryHmac,
} from "../../../utils/oauth-state";

const SECRET = "test_api_secret";

function signQuery(
  params: Record<string, string>,
  secret: string = SECRET,
): string {
  const message = Object.keys(params)
    .filter((key) => key !== "hmac")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

describe("buildStateCookieValue / verifyStateCookie", () => {
  const NONCE = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const NOW = 1_800_000_000_000;

  it("round-trips: a freshly built cookie verifies against its own nonce", () => {
    const cookie = buildStateCookieValue(NONCE, SECRET, NOW);
    expect(verifyStateCookie(cookie, NONCE, SECRET, NOW + 1000)).toBe(true);
  });

  it("embeds nonce and expiry as dot-separated parts with an HMAC signature", () => {
    const cookie = buildStateCookieValue(NONCE, SECRET, NOW);
    const parts = cookie.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(NONCE);
    expect(Number(parts[1])).toBeGreaterThan(NOW);
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects when the state param does not match the cookie nonce", () => {
    const cookie = buildStateCookieValue(NONCE, SECRET, NOW);
    expect(
      verifyStateCookie(cookie, "ffffffffffffffffffffffffffffffff", SECRET, NOW),
    ).toBe(false);
  });

  it("rejects a tampered cookie (nonce swapped, signature kept)", () => {
    const cookie = buildStateCookieValue(NONCE, SECRET, NOW);
    const [, expiry, sig] = cookie.split(".");
    const forged = `ffffffffffffffffffffffffffffffff.${expiry}.${sig}`;
    expect(
      verifyStateCookie(forged, "ffffffffffffffffffffffffffffffff", SECRET, NOW),
    ).toBe(false);
  });

  it("rejects an expired cookie (past the 10-minute TTL)", () => {
    const cookie = buildStateCookieValue(NONCE, SECRET, NOW);
    const elevenMinutesLater = NOW + 11 * 60 * 1000;
    expect(verifyStateCookie(cookie, NONCE, SECRET, elevenMinutesLater)).toBe(
      false,
    );
  });

  it("rejects missing or malformed inputs without throwing", () => {
    expect(verifyStateCookie(undefined, NONCE, SECRET)).toBe(false);
    expect(verifyStateCookie("", NONCE, SECRET)).toBe(false);
    expect(verifyStateCookie("not-a-cookie", NONCE, SECRET)).toBe(false);
    expect(verifyStateCookie("a.b", NONCE, SECRET)).toBe(false);
    const cookie = buildStateCookieValue(NONCE, SECRET);
    expect(verifyStateCookie(cookie, undefined, SECRET)).toBe(false);
  });

  it("rejects a cookie signed with a different secret", () => {
    const cookie = buildStateCookieValue(NONCE, "other_secret", NOW);
    expect(verifyStateCookie(cookie, NONCE, SECRET, NOW)).toBe(false);
  });
});

describe("verifyOAuthQueryHmac", () => {
  const baseQuery = {
    code: "auth-code-123",
    shop: "test-shop.myshopify.com",
    state: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    timestamp: "1700000000",
  };

  it("accepts a query whose hmac matches Shopify's signing scheme", () => {
    const hmac = signQuery(baseQuery);
    expect(verifyOAuthQueryHmac({ ...baseQuery, hmac }, SECRET)).toBe(true);
  });

  it("rejects when any signed parameter was tampered with", () => {
    const hmac = signQuery(baseQuery);
    expect(
      verifyOAuthQueryHmac(
        { ...baseQuery, shop: "evil-shop.myshopify.com", hmac },
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects when the hmac param is missing or malformed", () => {
    expect(verifyOAuthQueryHmac(baseQuery, SECRET)).toBe(false);
    expect(verifyOAuthQueryHmac({ ...baseQuery, hmac: "zz" }, SECRET)).toBe(
      false,
    );
  });

  it("rejects an hmac produced with the wrong secret", () => {
    const hmac = signQuery(baseQuery, "wrong_secret");
    expect(verifyOAuthQueryHmac({ ...baseQuery, hmac }, SECRET)).toBe(false);
  });
});
