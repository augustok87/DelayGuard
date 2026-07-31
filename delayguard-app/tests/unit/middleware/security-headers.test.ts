import { Context, Next } from 'koa';
import { securityHeaders } from '../../../src/middleware/security-headers';

// Mock Koa context
const createMockContext = (): Context => {
  const ctx = {
    set: jest.fn(),
    get: jest.fn().mockReturnValue('https'),
    secure: true,
    path: '/api/test',
    query: {} as Record<string, string>,
    response: {
      headers: {},
    },
  } as any;
  return ctx;
};

const createMockNext = (): Next => jest.fn().mockResolvedValue(undefined);

describe('Security Headers Middleware', () => {
  let ctx: Context;
  let next: Next;

  beforeEach(() => {
    ctx = createMockContext();
    next = createMockNext();
    jest.clearAllMocks();
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set comprehensive CSP headers', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'"),
      );
      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("script-src 'self' 'nonce-"),
      );
      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("style-src 'self' 'unsafe-inline'"),
      );
    });

    it('should include nonce for inline scripts', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining('nonce-'),
      );
    });
  });

  describe('HTTP Strict Transport Security (HSTS)', () => {
    it('should set HSTS header with proper values', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    });
  });

  describe('Shopify embedded-app framing (LAUNCH_PLAN A2)', () => {
    it('must NOT set X-Frame-Options — it cannot express an allow-list and blocks admin embedding', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).not.toHaveBeenCalledWith(
        'X-Frame-Options',
        expect.anything(),
      );
    });

    // R6: this replaced an assertion that the policy contained the wildcard
    // `https://*.myshopify.com`. shopify.dev requires the directive to name
    // the one shop and to "be different for every shop", so the wildcard was
    // the defect, not the contract.
    it('CSP frame-ancestors names the requesting shop, not a wildcard', async() => {
      ctx.query.shop = 'delayguard-dev.myshopify.com';

      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining(
          'frame-ancestors https://delayguard-dev.myshopify.com https://admin.shopify.com',
        ),
      );
      expect(ctx.set).not.toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining('*.myshopify.com'),
      );
    });

    it("CSP frame-ancestors is 'none' when the request names no shop", async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("frame-ancestors 'none'"),
      );
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });
  });

  describe('Referrer Policy', () => {
    it('should set Referrer-Policy to strict-origin-when-cross-origin', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
    });
  });

  describe('Permissions Policy', () => {
    it('should set Permissions-Policy with restrictive values', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('camera=()'),
      );
      expect(ctx.set).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('microphone=()'),
      );
      expect(ctx.set).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()'),
      );
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection header', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });
  });

  describe('Cross-Origin Policies', () => {
    it('should set Cross-Origin-Embedder-Policy', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Cross-Origin-Embedder-Policy',
        'require-corp',
      );
    });

    it('should set Cross-Origin-Opener-Policy', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        'same-origin',
      );
    });

    it('should set Cross-Origin-Resource-Policy', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin',
      );
    });
  });

  describe('Cache Control', () => {
    it('should set Cache-Control for API responses', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
    });

    it('should set Pragma no-cache', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('Pragma', 'no-cache');
    });

    it('should set Expires header', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('Expires', '0');
    });
  });

  describe('Server Information', () => {
    it('should set X-Powered-By header', async() => {
      await securityHeaders(ctx, next);

      expect(ctx.set).toHaveBeenCalledWith('X-Powered-By', 'DelayGuard');
    });
  });

  describe('Middleware Execution', () => {
    it('should call next() after setting headers', async() => {
      await securityHeaders(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should handle errors from next()', async() => {
      const error = new Error('Test error');
      (next as jest.Mock).mockRejectedValueOnce(error);

      await expect(securityHeaders(ctx, next)).rejects.toThrow('Test error');
    });
  });

  describe('Header Count', () => {
    it('should set all required security headers', async() => {
      await securityHeaders(ctx, next);

      // Count the number of times ctx.set was called
      const setCalls = (ctx.set as jest.Mock).mock.calls.length;
      expect(setCalls).toBeGreaterThanOrEqual(10); // Should set at least 10 security headers
    });
  });

  describe('Environment-specific Headers', () => {
    it('should set different headers in production', async() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await securityHeaders(ctx, next);

      // In production, should have stricter CSP
      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'"),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});