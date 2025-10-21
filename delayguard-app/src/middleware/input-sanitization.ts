/* eslint-disable @typescript-eslint/no-explicit-any */
// Input Sanitization Middleware with dynamic validation
import { Context, Next } from "koa";
import { ValidationError } from "../types";
import DOMPurify from "isomorphic-dompurify";
import validator from "validator";
import { escape } from "html-escaper";

/**
 * Sanitization Configuration
 */
export interface SanitizationConfig {
  enableXSSProtection?: boolean;
  enableSQLInjectionProtection?: boolean;
  enableHTMLSanitization?: boolean;
  enableInputValidation?: boolean;
  maxStringLength?: number;
  allowedHTMLTags?: string[];
  allowedHTMLAttributes?: string[];
  customValidators?: Record<string, (value: unknown) => boolean>;
  xss?: boolean;
  sql?: boolean;
  nosql?: boolean;
  pathTraversal?: boolean;
  commandInjection?: boolean;
}

/**
 * Input Sanitization Middleware
 * Comprehensive protection against XSS, SQL injection, and other attacks
 */
export class InputSanitizationMiddleware {
  private config: SanitizationConfig;

  constructor(config: SanitizationConfig = {}) {
    this.config = {
      enableXSSProtection: true,
      enableSQLInjectionProtection: true,
      enableHTMLSanitization: true,
      enableInputValidation: true,
      maxStringLength: 10000,
      allowedHTMLTags: ["b", "i", "em", "strong", "p", "br"],
      allowedHTMLAttributes: ["class", "id"],
      customValidators: {},
      ...config,
    };
  }

  /**
   * Apply input sanitization middleware
   */
  async apply(ctx: Context, next: Next): Promise<void> {
    try {
      // Sanitize request body
      if (ctx.request.body) {
        ctx.request.body = this.sanitizeObject(ctx.request.body);
      }

      // Sanitize query parameters
      if (ctx.query) {
        ctx.query = this.sanitizeObject(ctx.query as Record<string, unknown>) as any;
      }

      // Sanitize headers (basic sanitization)
      this.sanitizeHeaders(ctx);

      await next();
    } catch (error) {
      if (error instanceof ValidationError) {
        ctx.status = 400;
        ctx.body = {
          error: error.message,
          code: error.code,
          field: error.field,
        };
        return;
      }
      throw error;
    }
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === "object") {
      const sanitized: unknown = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeString(key);
        (sanitized as Record<string, unknown>)[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(input: string): string {
    if (typeof input !== "string") {
      return input;
    }

    // Check string length
    if (
      this.config.maxStringLength &&
      input.length > this.config.maxStringLength
    ) {
      throw new ValidationError(
        `Input exceeds maximum length of ${this.config.maxStringLength} characters`,
        "INPUT_TOO_LONG",
      );
    }

    let sanitized = input;

    // XSS Protection
    if (this.config.enableXSSProtection) {
      sanitized = this.sanitizeXSS(sanitized);
    }

    // HTML Sanitization
    if (this.config.enableHTMLSanitization) {
      sanitized = this.sanitizeHTML(sanitized);
    }

    // SQL Injection Protection
    if (this.config.enableSQLInjectionProtection) {
      sanitized = this.sanitizeSQLInjection(sanitized);
    }

    return sanitized;
  }

  /**
   * Sanitize XSS attacks
   */
  private sanitizeXSS(input: string): string {
    // Remove script tags and their content
    let sanitized = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      "",
    );

    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, "");

    // Remove on* event handlers
    sanitized = sanitized.replace(/\bon\w+\s*=/gi, "");

    // Escape HTML entities
    sanitized = escape(sanitized);

    return sanitized;
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHTML(input: string): string {
    if (!this.config.enableHTMLSanitization) {
      return input;
    }

    const config = {
      ALLOWED_TAGS: this.config.allowedHTMLTags || [],
      ALLOWED_ATTR: this.config.allowedHTMLAttributes || [],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize SQL injection attempts
   */
  private sanitizeSQLInjection(input: string): string {
    // Remove SQL comment patterns
    let sanitized = input.replace(/--/g, "");
    sanitized = sanitized.replace(/\/\*/g, "");
    sanitized = sanitized.replace(/\*\//g, "");

    // Remove SQL keywords that could be used in injection
    const sqlKeywords = [
      "union",
      "select",
      "insert",
      "update",
      "delete",
      "drop",
      "create",
      "alter",
      "exec",
      "execute",
      "sp_",
      "xp_",
      "waitfor",
      "delay",
      "shutdown",
    ];

    const regex = new RegExp(`\\b(${sqlKeywords.join("|")})\\b`, "gi");
    sanitized = sanitized.replace(regex, "");

    return sanitized;
  }

  /**
   * Sanitize headers
   */
  private sanitizeHeaders(ctx: Context): void {
    const dangerousHeaders = [
      "x-forwarded-for",
      "x-real-ip",
      "x-forwarded-proto",
      "user-agent",
    ];

    for (const header of dangerousHeaders) {
      const value = ctx.get(header);
      if (value) {
        // Basic sanitization for headers
        const sanitized = this.sanitizeString(value);
        if (sanitized !== value) {
          ctx.set(header, sanitized);
        }
      }
    }
  }

  /**
   * Validate input based on type
   */
  validateInput(value: unknown, type: string, field?: string): unknown {
    if (!this.config.enableInputValidation) {
      return value;
    }

    switch (type) {
      case "email":
        if (typeof value === "string" && !validator.isEmail(value)) {
          throw new ValidationError(
            "Invalid email format",
            "INVALID_EMAIL",
            field,
          );
        }
        break;

      case "url":
        if (typeof value === "string" && !validator.isURL(value)) {
          throw new ValidationError("Invalid URL format", "INVALID_URL", field);
        }
        break;

      case "number":
        if (typeof value !== "number" && !validator.isNumeric(String(value))) {
          throw new ValidationError(
            "Invalid number format",
            "INVALID_NUMBER",
            field,
          );
        }
        break;

      case "date":
        if (typeof value === "string" && !validator.isISO8601(value)) {
          throw new ValidationError(
            "Invalid date format",
            "INVALID_DATE",
            field,
          );
        }
        break;

      case "uuid":
        if (typeof value === "string" && !validator.isUUID(value)) {
          throw new ValidationError(
            "Invalid UUID format",
            "INVALID_UUID",
            field,
          );
        }
        break;

      default:
        // Use custom validator if available
        if (this.config.customValidators?.[type]) {
          if (!this.config.customValidators[type](value)) {
            throw new ValidationError(
              `Invalid ${type} format`,
              "INVALID_FORMAT",
              field,
            );
          }
        }
        break;
    }

    return value;
  }

  /**
   * Create sanitization middleware factory
   */
  static create(config?: SanitizationConfig) {
    const middleware = new InputSanitizationMiddleware(config);
    return middleware.apply.bind(middleware);
  }
}

/**
 * Advanced Input Validator
 */
export class AdvancedInputValidator {
  private config: SanitizationConfig;

  constructor(config: SanitizationConfig = {}) {
    this.config = config;
  }

  /**
   * Validate and sanitize request body against schema
   */
  validateSchema(data: unknown, schema: Record<string, any>): unknown {
    const result: unknown = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = (data as Record<string, unknown>)[field];

      if (rules.required && (value === undefined || value === null)) {
        throw new ValidationError(
          `${field} is required`,
          "REQUIRED_FIELD",
          field,
        );
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (rules.type && typeof value !== rules.type) {
          throw new ValidationError(
            `${field} must be of type ${rules.type}`,
            "INVALID_TYPE",
            field,
          );
        }

        // Length validation
        if (rules.minLength && (value as string).length < rules.minLength) {
          throw new ValidationError(
            `${field} must be at least ${rules.minLength} characters`,
            "TOO_SHORT",
            field,
          );
        }

        if (rules.maxLength && (value as string).length > rules.maxLength) {
          throw new ValidationError(
            `${field} must be at most ${rules.maxLength} characters`,
            "TOO_LONG",
            field,
          );
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
          throw new ValidationError(
            `${field} format is invalid`,
            "INVALID_PATTERN",
            field,
          );
        }

        // Custom validation
        if (rules.validator && !rules.validator(value)) {
          throw new ValidationError(
            `${field} validation failed`,
            "CUSTOM_VALIDATION_FAILED",
            field,
          );
        }

        (result as Record<string, unknown>)[field] = value;
      }
    }

    return result;
  }
}

/**
 * Security-focused input sanitization presets
 */
export const SanitizationPresets = {
  // Strict sanitization for user input
  USER_INPUT: {
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enableHTMLSanitization: true,
    maxStringLength: 1000,
    allowedHTMLTags: [],
    allowedHTMLAttributes: [],
  },

  // API input sanitization with comprehensive protection
  API_INPUT: {
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enableHTMLSanitization: true,
    enableInputValidation: true,
    maxStringLength: 10000,
    allowedHTMLTags: [],
    allowedHTMLAttributes: [],
    xss: true,
    sql: true,
    nosql: true,
    pathTraversal: true,
    commandInjection: true,
  },

  // Moderate sanitization for content
  CONTENT: {
    enableXSSProtection: true,
    enableSQLInjectionProtection: true,
    enableHTMLSanitization: true,
    maxStringLength: 5000,
    allowedHTMLTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    allowedHTMLAttributes: ["class"],
  },

  // Minimal sanitization for trusted input
  TRUSTED: {
    enableXSSProtection: true,
    enableSQLInjectionProtection: false,
    enableHTMLSanitization: false,
    maxStringLength: 10000,
  },
};
