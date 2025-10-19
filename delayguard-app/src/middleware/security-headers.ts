import { Context, Next } from "koa";

/**
 * Security Headers Middleware
 * Implements comprehensive security headers following OWASP guidelines
 */
export class SecurityHeadersMiddleware {
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
    "frame-ancestors 'none'",
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
    ctx.set("Content-Security-Policy", cspWithNonce);

    // Set X-Powered-By header
    ctx.set("X-Powered-By", "DelayGuard");

    // X-Frame-Options (redundant with CSP frame-ancestors but for older browsers)
    ctx.set("X-Frame-Options", "DENY");

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
