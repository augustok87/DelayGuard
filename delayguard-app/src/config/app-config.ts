/**
 * Application Configuration
 * Centralized configuration for the DelayGuard app
 */

import dotenv from "dotenv";
import { logger } from "../utils/logger";
import type { AppConfig } from "../types";

// Load environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

/**
 * Get required environment variable or throw error
 */
function requireEnvDev(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value) {
    if (process.env.NODE_ENV === "development" && defaultValue) {
      logger.warn(`Missing ${key}, using default: ${defaultValue}`);
      return defaultValue;
    }
    if (process.env.NODE_ENV === "production") {
      logger.error(`Missing required environment variable: ${key}`);
      return defaultValue || "";
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

/**
 * Code-default OAuth scopes. Keep in sync with `access_scopes` in
 * shopify.app.toml and SHOPIFY_SCOPES in env.example.
 */
export const DEFAULT_SHOPIFY_SCOPES = [
  // Read-only on purpose. The app observes orders and fulfillments and never
  // writes to either — its only mutation is webhookSubscriptionCreate, which
  // needs neither scope. Requesting a write scope the app never exercises is
  // an App Store review finding, and it shows on the merchant's consent
  // screen. `minimum-scopes.test.ts` fails if one is added back without a
  // matching write mutation.
  "read_orders",
  "read_fulfillments",
  "read_products", // Phase 1.2: Required for fetching product line items
  "read_customers", // Phase 2.1.a: Customer intelligence ingestion
] as const satisfies readonly string[];

/**
 * Parse SHOPIFY_SCOPES into a clean scope list.
 *
 * Every entry is trimmed and empties are dropped, because a scope carrying
 * whitespace silently corrupts the OAuth authorize URL: a value pasted into
 * the Vercel dashboard with a trailing newline produced
 * `scope=…,read_customers%0A` in production (R2/B1, 2026-07-29), which is
 * not a scope Shopify recognizes. Falls back to the code defaults when the
 * env var is unset or contains nothing usable.
 *
 * The env var may NARROW the defaults and never widen them (R39). A
 * SHOPIFY_SCOPES set in Vercel 338 days before the scopes were reduced kept
 * production asking merchants for write_orders and write_fulfillments, while
 * `minimum-scopes.test.ts` — which only ever read the constant below — went
 * on passing. Filtering here is what makes that test's claim true of the
 * authorize URL the merchant actually sees. Adding a scope stays a code
 * change, which is the same place the review evidence for needing it lives.
 */
export function parseScopes(raw: string | undefined): string[] {
  const declared = new Set<string>(DEFAULT_SHOPIFY_SCOPES);

  const requested = (raw ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);

  const granted = requested.filter((scope) => declared.has(scope));

  return granted.length > 0 ? granted : [...DEFAULT_SHOPIFY_SCOPES];
}

/**
 * Application configuration object
 * Uses environment variables with defaults for development
 */
export const appConfig: AppConfig = {
  shopify: {
    apiKey: requireEnvDev("SHOPIFY_API_KEY", "dev_api_key"),
    apiSecret: requireEnvDev("SHOPIFY_API_SECRET", "dev_api_secret"),
    scopes: parseScopes(process.env.SHOPIFY_SCOPES),
  },
  database: {
    url: requireEnvDev(
      "DATABASE_URL",
      "postgresql://localhost:5432/delayguard_dev",
    ),
  },
  redis: {
    url: requireEnvDev("REDIS_URL", "redis://localhost:6379"),
  },
  easypost: {
    apiKey: requireEnvDev("EASYPOST_API_KEY", "dev_easypost_key"),
  },
  sendgrid: {
    apiKey: requireEnvDev("SENDGRID_API_KEY", "dev_sendgrid_key"),
  },
  twilio: {
    accountSid: requireEnvDev("TWILIO_ACCOUNT_SID", "dev_twilio_sid"),
    authToken: requireEnvDev("TWILIO_AUTH_TOKEN", "dev_twilio_token"),
    phoneNumber: requireEnvDev("TWILIO_PHONE_NUMBER", "+15555555555"),
  },
};
