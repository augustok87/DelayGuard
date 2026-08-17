/**
 * The From address must be configurable — LAUNCH_PLAN §6 R1.
 *
 * `email-service.ts` hardcoded `noreply@delayguard.app` from the project's
 * first commit (2025-09-25). The domain was not registered until
 * 2026-02-06, four months later, and by someone we cannot identify: it is
 * absent from the Squarespace account, there is no purchase receipt in the
 * owner's mail, and it serves a "Squarespace - Website Expired" page. The
 * app has only ever run on `delayguard-api.vercel.app`.
 *
 * So the sender was aspirational, never owned, and it blocked the one
 * launch-critical channel — SendGrid rejects any From address that is not
 * a verified sender identity, and you cannot verify a domain you do not
 * control.
 *
 * The fix is `SENDGRID_FROM_EMAIL`, following the exact shape already used
 * for `SENDGRID_DELAY_TEMPLATE_ID`: configurable everywhere, and **fails
 * loudly in production when unset** rather than sending from an address
 * that will bounce. A silent wrong sender is worse than a refused send —
 * one is a mystery, the other names itself.
 */
import { resolveFromAddress } from "../../../src/services/email-service";

describe("resolveFromAddress", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SENDGRID_FROM_EMAIL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses the configured address", () => {
    process.env.SENDGRID_FROM_EMAIL = "noreply@delayguardapp.com";

    expect(resolveFromAddress()).toBe("noreply@delayguardapp.com");
  });

  it("trims surrounding whitespace", () => {
    // B1 shipped a trailing newline in a Vercel env var to production once
    // already; an untrimmed From address would be rejected by SendGrid.
    process.env.SENDGRID_FROM_EMAIL = "  noreply@delayguardapp.com\n";

    expect(resolveFromAddress()).toBe("noreply@delayguardapp.com");
  });

  it("throws in production when unset, rather than sending from a domain we do not own", () => {
    process.env.NODE_ENV = "production";

    expect(() => resolveFromAddress()).toThrow(/SENDGRID_FROM_EMAIL/);
  });

  it("treats a whitespace-only value as unset in production", () => {
    process.env.NODE_ENV = "production";
    process.env.SENDGRID_FROM_EMAIL = "   ";

    expect(() => resolveFromAddress()).toThrow(/SENDGRID_FROM_EMAIL/);
  });

  it("falls back to a reserved-TLD placeholder outside production", () => {
    process.env.NODE_ENV = "test";

    const fallback = resolveFromAddress();

    // RFC 2606 reserves .example, so the fallback can never collide with a
    // real domain the way `delayguard.app` did.
    expect(fallback).toMatch(/\.example$/);
    expect(fallback).not.toContain("delayguard.app");
  });
});
