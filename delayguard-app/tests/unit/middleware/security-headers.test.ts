import request from 'supertest';
import Koa from 'koa';
import { securityHeaders } from '../../../src/middleware/security-headers';

describe('Security Headers Middleware', () => {
  let app: Koa;

  beforeEach(() => {
    app = new Koa();
    app.use(securityHeaders);
    app.use(async (ctx) => {
      ctx.body = { message: 'test' };
    });
  });

  describe('Content Security Policy', () => {
    it('should set comprehensive CSP header', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      expect(response.headers['content-security-policy']).toContain("script-src 'self'");
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
      expect(response.headers['content-security-policy']).toContain("upgrade-insecure-requests");
    });

    it('should allow Shopify domains in CSP', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('https://cdn.shopify.com');
      expect(csp).toContain('https://checkout.shopify.com');
      expect(csp).toContain('https://api.shopify.com');
    });
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection to block mode', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Strict-Transport-Security', () => {
    it('should set HSTS header for HTTPS requests', async () => {
      const response = await request(app.callback())
        .get('/')
        .set('x-forwarded-proto', 'https')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
    });

    it('should not set HSTS header for HTTP requests', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['strict-transport-security']).toBeUndefined();
    });
  });

  describe('Referrer Policy', () => {
    it('should set Referrer-Policy header', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Permissions Policy', () => {
    it('should set Permissions-Policy header', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['permissions-policy']).toBeDefined();
      expect(response.headers['permissions-policy']).toContain('camera=()');
      expect(response.headers['permissions-policy']).toContain('microphone=()');
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
    });
  });

  describe('Cross-Origin Policies', () => {
    it('should set Cross-Origin-Embedder-Policy', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');
    });

    it('should set Cross-Origin-Opener-Policy', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });

    it('should set Cross-Origin-Resource-Policy', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    });
  });

  describe('Cache Control for API endpoints', () => {
    it('should set no-cache headers for API endpoints', async () => {
      const response = await request(app.callback())
        .get('/api/test')
        .expect(200);

      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should set no-cache headers for auth endpoints', async () => {
      const response = await request(app.callback())
        .get('/auth/test')
        .expect(200);

      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });
  });

  describe('Server Information Removal', () => {
    it('should remove X-Powered-By header', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should remove Server header', async () => {
      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.headers['server']).toBeUndefined();
    });
  });

  describe('Security Headers Configuration', () => {
    it('should provide configuration access', () => {
      const { SecurityHeadersMiddleware } = require('../../../src/middleware/security-headers');
      const config = SecurityHeadersMiddleware.getConfig();

      expect(config).toBeDefined();
      expect(config.csp).toBeDefined();
      expect(config.hsts).toBeDefined();
      expect(config.hsts.maxAge).toBe(31536000);
      expect(config.hsts.includeSubdomains).toBe(true);
      expect(config.hsts.preload).toBe(true);
    });
  });
});
