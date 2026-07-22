/**
 * OAuth state-token + callback-HMAC helpers — WS-C C3.
 *
 * The `state` nonce defends the OAuth callback against CSRF. Rather than
 * a server-side session store (none exists in this serverless deploy) or
 * Koa signed cookies (would require app.keys), the cookie value is
 * self-authenticating: `nonce.expiresAt.hmac`, signed with the Shopify
 * API secret. The callback verifies the signature + TTL, then compares
 * the embedded nonce against the `state` query param.
 *
 * verifyOAuthQueryHmac implements Shopify's OAuth callback query signing:
 * drop the `hmac` param, sort the remaining `key=value` pairs
 * lexicographically, join with `&`, HMAC-SHA256 hex with the API secret.
 * (Same family as the webhook HMAC rule in .claude/rules/backend.md —
 * verify before trusting any payload field.)
 */
import crypto from "crypto";

export const STATE_COOKIE_NAME = "delayguard_oauth_state";

/** State cookie lifetime — generous for the authorize round-trip. */
const STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/** 128-bit random nonce, hex-encoded (32 chars). */
export function generateStateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildStateCookieValue(
  nonce: string,
  secret: string,
  now: number = Date.now(),
): string {
  const expiresAt = now + STATE_TTL_MS;
  const payload = `${nonce}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyStateCookie(
  cookieValue: string | undefined,
  state: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!cookieValue || !state) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;

  const [nonce, expiryRaw, signature] = parts;
  const expiresAt = Number(expiryRaw);
  if (!Number.isFinite(expiresAt) || now > expiresAt) return false;

  const expected = sign(`${nonce}.${expiryRaw}`, secret);
  if (!timingSafeEqualStrings(signature, expected)) return false;

  return timingSafeEqualStrings(nonce, state);
}

export function verifyOAuthQueryHmac(
  query: Record<string, unknown>,
  secret: string,
): boolean {
  const provided = query.hmac;
  if (typeof provided !== "string" || !/^[0-9a-f]{64}$/.test(provided)) {
    return false;
  }

  const message = Object.keys(query)
    .filter((key) => key !== "hmac")
    .sort()
    .map((key) => {
      const value = query[key];
      return `${key}=${Array.isArray(value) ? value.join(",") : String(value)}`;
    })
    .join("&");

  return timingSafeEqualStrings(provided, sign(message, secret));
}
