import { Context, Next } from "koa";
import { frameAncestorsDirective } from "./frame-ancestors";

/**
 * Security Headers Middleware
 * Implements comprehensive security headers following OWASP guidelines
 */
export class SecurityHeadersMiddleware {
  /**
   * Everything except `frame-ancestors`, which is per-shop (R6) and so has
   * to be computed from the request rather than baked in here.
   */
  private static readonly CSP_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://checkout.shopify.com",
    "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://cdn.shopify.com",
    "connect-src 'self' https://api.shopify.com https://checkout.shopify.com wss:",
    "frame-src 'self' https://checkout.shopify.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  private static readonly HSTS_MAX_AGE = 31536000; // 1 year
  private static readonly HSTS_INCLUDE_SUBDOMAINS = true;
  private static readonly HSTS_PRELOAD = true;

  /**
   * Apply comprehensive security headers
   */
  static async apply(ctx: Context, next: Next): Promise<void> {
    // Generate nonce for inline scripts
    const nonce = require("crypto").randomBytes(16).toString("base64");

    // Content Security Policy with nonce
    const cspWithNonce = SecurityHeadersMiddleware.CSP_POLICY.replace(
      "script-src 'self' 'unsafe-inline'",
      `script-src 'self' 'nonce-${nonce}'`,
    );
    // R6: frame-ancestors names the one shop this request belongs to, which
    // shopify.dev requires to "be different for every shop". Requests with
    // no `shop` are not framed by the admin, so they get 'none'.
    ctx.set(
      "Content-Security-Policy",
      `${cspWithNonce}; ${frameAncestorsDirective(ctx.query?.shop)}`,
    );

    // Set X-Powered-By header
    ctx.set("X-Powered-By", "DelayGuard");

    // NO X-Frame-Options (LAUNCH_PLAN A2): it cannot express an
    // allow-list, so any value (DENY/SAMEORIGIN) would block Shopify
    // admin embedding. CSP frame-ancestors above is the framing policy.

    // X-Content-Type-Options
    ctx.set("X-Content-Type-Options", "nosniff");

    // X-XSS-Protection
    ctx.set("X-XSS-Protection", "1; mode=block");

    // Strict-Transport-Security
    if (ctx.secure || ctx.get("x-forwarded-proto") === "https") {
      const hstsValue = `max-age=${SecurityHeadersMiddleware.HSTS_MAX_AGE}${
        SecurityHeadersMiddleware.HSTS_INCLUDE_SUBDOMAINS
          ? "; includeSubDomains"
          : ""
      }${SecurityHeadersMiddleware.HSTS_PRELOAD ? "; preload" : ""}`;
      ctx.set("Strict-Transport-Security", hstsValue);
    }

    // Referrer Policy
    ctx.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy (formerly Feature Policy)
    ctx.set(
      "Permissions-Policy",
      [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "magnetometer=()",
        "gyroscope=()",
        "accelerometer=()",
      ].join(", "),
    );

    // Cross-Origin Policies
    ctx.set("Cross-Origin-Embedder-Policy", "require-corp");
    ctx.set("Cross-Origin-Opener-Policy", "same-origin");
    ctx.set("Cross-Origin-Resource-Policy", "same-origin");

    // Cache Control for sensitive endpoints
    if (ctx.path.startsWith("/api/") || ctx.path.startsWith("/auth/")) {
      ctx.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      ctx.set("Pragma", "no-cache");
      ctx.set("Expires", "0");
    }

    // Remove server information
    delete ctx.response.headers["X-Powered-By"];
    delete ctx.response.headers["Server"];

    await next();
  }

  /**
   * Get current security headers configuration
   */
  static getConfig() {
    return {
      csp: SecurityHeadersMiddleware.CSP_POLICY,
      hsts: {
        maxAge: SecurityHeadersMiddleware.HSTS_MAX_AGE,
        includeSubdomains: SecurityHeadersMiddleware.HSTS_INCLUDE_SUBDOMAINS,
        preload: SecurityHeadersMiddleware.HSTS_PRELOAD,
      },
    };
  }
}

/**
 * Security headers middleware factory
 */
export const securityHeaders = SecurityHeadersMiddleware.apply;
