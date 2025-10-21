/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '../utils/logger';
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
  SHIPENGINE_API_KEY: string;
  SENDGRID_API_KEY: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;

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

    // Required variables for production
    const requiredVars: (keyof EnvironmentConfig)[] = [
      "NODE_ENV",
      "PORT",
      "HOST",
      "SHOPIFY_API_KEY",
      "SHOPIFY_API_SECRET",
      "SHOPIFY_SCOPES",
      "DATABASE_URL",
      "REDIS_URL",
      "SHIPENGINE_API_KEY",
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
      "SHIPENGINE_API_KEY",
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

export type { EnvironmentConfig, ValidationResult };
export { EnvironmentValidator };
export default envValidator;
