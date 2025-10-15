import { Context, Next } from 'koa';
import crypto from 'crypto';
import { ValidationError } from '../types';

/**
 * CSRF Token Configuration
 */
export interface CSRFConfig {
  secret: string;
  tokenLength?: number;
  cookieName?: string;
  headerName?: string;
  cookieOptions?: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
  excludedMethods?: string[];
  excludedPaths?: string[];
}

/**
 * CSRF Protection Middleware
 * Implements double-submit cookie pattern for CSRF protection
 */
export class CSRFProtectionMiddleware {
  private config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = {
      tokenLength: 32,
      cookieName: '_csrf',
      headerName: 'x-csrf-token',
      cookieOptions: {
        httpOnly: false, // Must be readable by JavaScript
        secure: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
      excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
      excludedPaths: ['/health', '/api/health'],
      ...config,
    };
  }

  /**
   * Apply CSRF protection middleware
   */
  async apply(ctx: Context, next: Next): Promise<void> {
    // Generate and set CSRF token for GET requests
    if (ctx.method === 'GET') {
      const token = this.generateToken();
      this.setCSRFCookie(ctx, token);
      ctx.state.csrfToken = token;
      await next();
      return;
    }

    // Skip CSRF check for excluded methods and paths
    if (this.shouldSkipCSRFCheck(ctx)) {
      await next();
      return;
    }

    // Validate CSRF token for state-changing requests
    const isValid = this.validateToken(ctx);
    if (!isValid) {
      ctx.status = 403;
      ctx.body = {
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      };
      return;
    }

    await next();
  }

  /**
   * Generate CSRF token
   */
  private generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength!).toString('hex');
  }

  /**
   * Set CSRF cookie
   */
  private setCSRFCookie(ctx: Context, token: string): void {
    const cookieOptions = this.config.cookieOptions!;
    ctx.cookies.set(this.config.cookieName!, token, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      maxAge: cookieOptions.maxAge,
    });
  }

  /**
   * Validate CSRF token
   */
  private validateToken(ctx: Context): boolean {
    const cookieToken = ctx.cookies.get(this.config.cookieName!);
    const headerToken = ctx.get(this.config.headerName!);
    const bodyToken = (ctx.request as any).body?.csrfToken;

    // Token can be in header or body
    const providedToken = headerToken || bodyToken;

    if (!cookieToken || !providedToken) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    // Ensure both tokens are the same length to avoid timing attacks
    if (cookieToken.length !== providedToken.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, 'utf8'),
      Buffer.from(providedToken, 'utf8'),
    );
  }

  /**
   * Check if CSRF check should be skipped
   */
  private shouldSkipCSRFCheck(ctx: Context): boolean {
    // Skip for excluded methods (but not GET - GET needs token generation)
    if (this.config.excludedMethods!.includes(ctx.method) && ctx.method !== 'GET') {
      return true;
    }

    // Skip for excluded paths
    if (this.config.excludedPaths!.some(path => ctx.path.startsWith(path))) {
      return true;
    }

    return false;
  }

  /**
   * Get CSRF token for current request
   */
  getToken(ctx: Context): string | null {
    return ctx.state.csrfToken || null;
  }

  /**
   * Create CSRF protection middleware factory
   */
  static create(config: CSRFConfig) {
    const middleware = new CSRFProtectionMiddleware(config);
    return middleware.apply.bind(middleware);
  }
}

/**
 * CSRF Token Generator for frontend
 */
export class CSRFTokenGenerator {
  private config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = config;
  }

  /**
   * Generate CSRF token for API requests
   */
  generateToken(): string {
    return crypto.randomBytes(this.config.tokenLength || 32).toString('hex');
  }

  /**
   * Validate token against secret
   */
  validateToken(token: string, secret: string): boolean {
    try {
      const expectedToken = crypto
        .createHmac('sha256', this.config.secret)
        .update(secret)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(expectedToken, 'hex'),
      );
    } catch (error) {
      return false;
    }
  }
}

/**
 * CSRF Protection for API routes
 */
export class APICSRFProtection {
  private config: CSRFConfig;

  constructor(config: CSRFConfig) {
    this.config = config;
  }

  /**
   * Apply CSRF protection to API routes
   */
  async apply(ctx: Context, next: Next): Promise<void> {
    // Only apply to state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(ctx.method)) {
      await next();
      return;
    }

    // Check for CSRF token in header
    const csrfToken = ctx.get(this.config.headerName || 'x-csrf-token');
    if (!csrfToken) {
      ctx.status = 403;
      ctx.body = {
        error: 'CSRF token required',
        code: 'CSRF_TOKEN_REQUIRED',
      };
      return;
    }

    // Validate token (simplified for API - in production, use proper validation)
    if (csrfToken.length < 32) {
      ctx.status = 403;
      ctx.body = {
        error: 'Invalid CSRF token format',
        code: 'CSRF_TOKEN_INVALID',
      };
      return;
    }

    await next();
  }

  /**
   * Create API CSRF protection middleware
   */
  static create(config: CSRFConfig) {
    const middleware = new APICSRFProtection(config);
    return middleware.apply.bind(middleware);
  }
}
