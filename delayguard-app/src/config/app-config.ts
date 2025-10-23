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
 * Application configuration object
 * Uses environment variables with defaults for development
 */
export const appConfig: AppConfig = {
  shopify: {
    apiKey: requireEnvDev("SHOPIFY_API_KEY", "dev_api_key"),
    apiSecret: requireEnvDev("SHOPIFY_API_SECRET", "dev_api_secret"),
    scopes: process.env.SHOPIFY_SCOPES?.split(",") || [
      "read_orders",
      "write_orders",
      "read_fulfillments",
      "write_fulfillments",
    ],
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
  shipengine: {
    apiKey: requireEnvDev("SHIPENGINE_API_KEY", "dev_shipengine_key"),
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
