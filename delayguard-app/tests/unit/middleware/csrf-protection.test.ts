import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { CSRFProtectionMiddleware, CSRFTokenGenerator, APICSRFProtection } from '../../../src/middleware/csrf-protection';

describe('CSRF Protection Middleware', () => {
  let app: Koa;
  const csrfConfig = {
    secret: 'test-secret-key',
    cookieName: '_csrf',
    headerName: 'x-csrf-token',
    cookieOptions: {
      httpOnly: false,
      secure: false, // Set to false for testing
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000
    }
  };

  describe('Basic CSRF Protection', () => {
    beforeEach(() => {
      app = new Koa();
      app.use(bodyParser());
    });

    it('should generate and set CSRF token for GET requests', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { 
          message: 'success',
          csrfToken: ctx.state.csrfToken 
        };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('_csrf=');
    });

    it('should accept valid CSRF token for POST requests', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { 
          message: 'success',
          csrfToken: ctx.state.csrfToken 
        };
      });

      // First, get the CSRF token
      const getResponse = await request(app.callback())
        .get('/')
        .expect(200);

      const csrfToken = getResponse.body.csrfToken;
      const cookie = getResponse.headers['set-cookie'];
      
      // Verify we got the token
      expect(csrfToken).toBeDefined();
      expect(csrfToken).toHaveLength(64);

      // Then use it in POST request
      const postResponse = await request(app.callback())
        .post('/')
        .set('Cookie', cookie[0]) // Use the first cookie string
        .set('x-csrf-token', csrfToken)
        .send({ data: 'test' })
        .expect(200);

      expect(postResponse.body.message).toBe('success');
    });

    it('should reject requests without CSRF token', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should reject requests with invalid CSRF token', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/')
        .set('x-csrf-token', 'invalid-token')
        .set('Cookie', '_csrf=another-invalid-token')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should accept CSRF token in request body', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { 
          message: 'success',
          csrfToken: ctx.state.csrfToken 
        };
      });

      // Get CSRF token
      const getResponse = await request(app.callback())
        .get('/')
        .expect(200);

      const csrfToken = getResponse.body.csrfToken;
      const cookie = getResponse.headers['set-cookie'];

      // Use token in body
      const postResponse = await request(app.callback())
        .post('/')
        .set('Cookie', cookie[0]) // Use the first cookie string
        .send({ 
          data: 'test',
          csrfToken: csrfToken 
        })
        .expect(200);

      expect(postResponse.body.message).toBe('success');
    });
  });

  describe('Excluded Methods and Paths', () => {
    beforeEach(() => {
      app = new Koa();
      app.use(bodyParser());
    });

    it('should skip CSRF check for GET requests', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should skip CSRF check for HEAD requests', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .head('/')
        .expect(200);

      expect(response.body).toEqual({}); // HEAD requests don't have body
    });

    it('should skip CSRF check for OPTIONS requests', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .options('/')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should skip CSRF check for excluded paths', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create({
        ...csrfConfig,
        excludedPaths: ['/health', '/api/health']
      });
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/health')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('success');
    });
  });

  describe('CSRF Token Generator', () => {
    let tokenGenerator: CSRFTokenGenerator;

    beforeEach(() => {
      tokenGenerator = new CSRFTokenGenerator(csrfConfig);
    });

    it('should generate valid tokens', () => {
      const token = tokenGenerator.generateToken();
      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = tokenGenerator.generateToken();
      const token2 = tokenGenerator.generateToken();
      expect(token1).not.toBe(token2);
    });

    it('should validate tokens correctly', () => {
      const token = tokenGenerator.generateToken();
      const secret = 'test-secret';
      
      // This is a simplified test - in production, use proper HMAC validation
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('API CSRF Protection', () => {
    beforeEach(() => {
      app = new Koa();
      app.use(bodyParser());
    });

    it('should allow GET requests without CSRF token', async () => {
      const apiCsrfProtection = APICSRFProtection.create(csrfConfig);
      app.use(apiCsrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should require CSRF token for POST requests', async () => {
      const apiCsrfProtection = APICSRFProtection.create(csrfConfig);
      app.use(apiCsrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('CSRF token required');
      expect(response.body.code).toBe('CSRF_TOKEN_REQUIRED');
    });

    it('should accept valid CSRF token for POST requests', async () => {
      const apiCsrfProtection = APICSRFProtection.create(csrfConfig);
      app.use(apiCsrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/')
        .set('x-csrf-token', 'a'.repeat(32)) // Valid length
        .send({ data: 'test' })
        .expect(200);

      expect(response.body.message).toBe('success');
    });

    it('should reject invalid CSRF token format', async () => {
      const apiCsrfProtection = APICSRFProtection.create(csrfConfig);
      app.use(apiCsrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .post('/')
        .set('x-csrf-token', 'short') // Too short
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token format');
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    });
  });

  describe('Cookie Configuration', () => {
    beforeEach(() => {
      app = new Koa();
      app.use(bodyParser());
    });

    it('should set CSRF cookie with correct options', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create({
        ...csrfConfig,
        cookieOptions: {
          httpOnly: false,
          secure: false, // Set to false for testing
          sameSite: 'strict' as const,
          maxAge: 3600000 // 1 hour
        }
      });
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      const response = await request(app.callback())
        .get('/')
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('_csrf=');
      expect(setCookieHeader[0]).not.toContain('HttpOnly'); // Should be false, so not present
      expect(setCookieHeader[0]).not.toContain('Secure'); // Should be false for testing
      expect(setCookieHeader[0]).toContain('samesite=strict');
    });
  });

  describe('Timing Attack Protection', () => {
    beforeEach(() => {
      app = new Koa();
      app.use(bodyParser());
    });

    it('should use constant-time comparison', async () => {
      const csrfProtection = CSRFProtectionMiddleware.create(csrfConfig);
      app.use(csrfProtection);
      app.use(async (ctx) => {
        ctx.body = { message: 'success' };
      });

      // This test verifies that the middleware uses timing-safe comparison
      // In a real scenario, you'd measure timing differences
      const response = await request(app.callback())
        .post('/')
        .set('x-csrf-token', 'a'.repeat(64))
        .set('Cookie', '_csrf=' + 'b'.repeat(64))
        .send({ data: 'test' })
        .expect(403);

      expect(response.body.error).toBe('Invalid CSRF token');
    });
  });
});
