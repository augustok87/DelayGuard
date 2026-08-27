/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../utils/logger";
/**
 * Environment Configuration and Validation
 *
 * This module provides centralized environment variable management
 * with comprehensive validation and type safety.
 */

interface EnvironmentConfig {
  // App Configuration
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  HOST: string;

  // Shopify Configuration
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;

  // Database Configuration
  DATABASE_URL: string;

  // Redis Configuration
  REDIS_URL: string;

  // External APIs
  EASYPOST_API_KEY: string;
  SENDGRID_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;

  // Email delivery (LAUNCH_PLAN §6 R1/R11). Required in production: the send
  // path refuses to run without them, and for three weeks nothing ever sent.
  SENDGRID_DELAY_TEMPLATE_ID?: string;
  SENDGRID_FROM_EMAIL?: string;

  // Monitoring
  SENTRY_DSN?: string;

  // Security
  CSRF_SECRET?: string;
  JWT_SECRET?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * EmailService's dev-only stand-in (see services/email-service.ts). Kept in
 * sync by environment-sendgrid.test.ts, which imports both.
 */
const PLACEHOLDER_DELAY_TEMPLATE_ID = "d-delay-notification-template";

class EnvironmentValidator {
  private config: Partial<EnvironmentConfig> = {};
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validates all required environment variables
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Required variables for production.
    // PORT/HOST are intentionally NOT required: they only matter for the local
    // dev `app.listen` (server.ts defaults them to 3000/localhost). On Vercel
    // serverless there is no port to bind, so requiring them here crashed the
    // function on cold start (FUNCTION_INVOCATION_FAILED).
    const requiredVars: (keyof EnvironmentConfig)[] = [
      "NODE_ENV",
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "SHOPIFY_SCOPES",
      "DATABASE_URL",
      "REDIS_URL",
      "EASYPOST_API_KEY",
      "SENDGRID_API_KEY",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
    ];

    // Validate required variables
    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        this.errors.push(`Missing required environment variable: ${varName}`);
      } else {
        this.config[varName] = value as any;
      }
    }

    // Validate specific formats
    this.validateDatabaseUrl();
    this.validateRedisUrl();
    this.validatePort();
    this.validateNodeEnv();
    this.validateApiKeys();
    this.validateSendGridDelivery();

    // Check for optional but recommended variables
    this.checkOptionalVariables();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private validateDatabaseUrl(): void {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.startsWith("postgresql://")) {
      this.errors.push(
        "DATABASE_URL must be a valid PostgreSQL connection string",
      );
    }
  }

  private validateRedisUrl(): void {
    const redisUrl = process.env.REDIS_URL;
    if (
      redisUrl &&
      !redisUrl.startsWith("redis://") &&
      !redisUrl.startsWith("rediss://")
    ) {
      this.errors.push("REDIS_URL must be a valid Redis connection string");
    }
  }

  private validatePort(): void {
    const port = process.env.PORT;
    if (port) {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        this.errors.push("PORT must be a valid number between 1 and 65535");
      } else {
        this.config.PORT = portNum;
      }
    }
  }

  private validateNodeEnv(): void {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv && !["development", "production", "test"].includes(nodeEnv)) {
      this.errors.push(
        "NODE_ENV must be one of: development, production, test",
      );
    } else if (nodeEnv) {
      this.config.NODE_ENV = nodeEnv as EnvironmentConfig["NODE_ENV"];
    }
  }

  private validateApiKeys(): void {
    const apiKeys = [
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "EASYPOST_API_KEY",
      "SENDGRID_API_KEY",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
    ];

    for (const key of apiKeys) {
      const value = process.env[key];
      if (value && value.includes("your_") && value.includes("_here")) {
        this.errors.push(`${key} appears to be a placeholder value`);
      }
    }
  }

  /**
   * SendGrid delivery variables (§6 R11).
   *
   * These are what actually make a delay email leave the building, and their
   * absence is invisible: EmailService throws only on the send path, so a
   * deployment with neither set looks perfectly healthy until a notification
   * is owed. Boot is the right place to find out.
   *
   * ABSENCE is fatal in production (module load calls process.exit(1)): a
   * deployment that cannot deliver its only product should not pretend to be
   * healthy, and absence is unambiguous.
   *
   * FORMAT problems only ever warn. The production values are Sensitive Vercel
   * variables that no session can read, so a format rule that turned out to be
   * too narrow — a `Name <addr@host>` From, an id shape SendGrid also accepts —
   * would take the whole app down on a working deployment. Reject what is
   * known-bad; never guess at what is known-good.
   *
   * Outside production everything warns, so local dev still boots against
   * EmailService's dev placeholders.
   */
  private validateSendGridDelivery(): void {
    const isProduction = process.env.NODE_ENV === "production";
    const missing = (message: string): void => {
      if (isProduction) {
        this.errors.push(message);
      } else {
        this.warnings.push(message);
      }
    };
    const suspect = (message: string): void => {
      this.warnings.push(message);
    };

    const templateId = process.env.SENDGRID_DELAY_TEMPLATE_ID?.trim();
    if (!templateId) {
      missing(
        "SENDGRID_DELAY_TEMPLATE_ID is not set — delay emails cannot be sent. " +
          "Create the template with `npm run sendgrid:create-template` and set the printed d-… id.",
      );
    } else if (templateId === PLACEHOLDER_DELAY_TEMPLATE_ID) {
      // Reject the value we KNOW is wrong rather than pattern-matching the
      // ones we think are right: the production id is a Sensitive Vercel
      // variable no session can read, so a format guess that turned out to be
      // too narrow would fail boot on a perfectly good deployment.
      suspect(
        "SENDGRID_DELAY_TEMPLATE_ID is still EmailService's dev placeholder — " +
          "SendGrid will reject the send. Set the real d-… id.",
      );
    } else {
      this.config.SENDGRID_DELAY_TEMPLATE_ID = templateId;
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
    if (!fromEmail) {
      missing(
        "SENDGRID_FROM_EMAIL is not set — delay emails cannot be sent. " +
          "Set it to an address on a domain authenticated in SendGrid.",
      );
    } else if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(fromEmail)) {
      suspect(
        `SENDGRID_FROM_EMAIL does not look like a bare email address (got "${fromEmail}") — ` +
          "SendGrid rejects any From that is not a verified sender identity.",
      );
    } else {
      this.config.SENDGRID_FROM_EMAIL = fromEmail;
    }
  }

  private checkOptionalVariables(): void {
    const optionalVars = [
      { name: "SENTRY_DSN", description: "Error monitoring" },
      { name: "CSRF_SECRET", description: "CSRF protection" },
      { name: "JWT_SECRET", description: "JWT token signing" },
    ];

    for (const { name, description } of optionalVars) {
      if (!process.env[name]) {
        this.warnings.push(
          `Optional variable ${name} not set (${description})`,
        );
      } else {
        this.config[name as keyof EnvironmentConfig] = process.env[name] as any;
      }
    }
  }

  /**
   * Get the validated configuration
   */
  getConfig(): EnvironmentConfig {
    if (this.errors.length > 0) {
      throw new Error(
        `Environment validation failed: ${this.errors.join(", ")}`,
      );
    }
    return this.config as EnvironmentConfig;
  }

  /**
   * Get a specific environment variable with type safety
   */
  get<T extends keyof EnvironmentConfig>(key: T): EnvironmentConfig[T] {
    const value = this.config[key];
    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return this.config.NODE_ENV === "production";
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    return this.config.NODE_ENV === "development";
  }

  /**
   * Check if running in test
   */
  isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }
}

// Create singleton instance
const envValidator = new EnvironmentValidator();

// Validate environment on module load
const validation = envValidator.validate();

if (!validation.isValid) {
  logger.error("❌ Environment validation failed:");
  validation.errors.forEach((error) => logger.error(`  - ${error}`));

  if (validation.warnings.length > 0) {
    logger.warn("⚠️  Environment warnings:");
    validation.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  // In production, exit on validation failure
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
} else {
  logger.info("✅ Environment validation passed");
  if (validation.warnings.length > 0) {
    logger.warn("⚠️  Environment warnings:");
    validation.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }
}

/**
 * Helper function to require an environment variable
 * Throws an error if the variable is not set
 * @param key The environment variable key
 * @returns The environment variable value
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const errorMessage = `Missing required environment variable: ${key}`;
    logger.error(errorMessage);

    // In production, throw error immediately
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMessage);
    }

    // In development/test, log warning but don't throw
    logger.warn(
      `Using empty string for ${key} in ${process.env.NODE_ENV} environment`,
    );
    return "";
  }
  return value;
}

export type { EnvironmentConfig, ValidationResult };
export { EnvironmentValidator };
export default envValidator;
