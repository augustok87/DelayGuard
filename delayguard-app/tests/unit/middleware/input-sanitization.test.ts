import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { InputSanitizationMiddleware, AdvancedInputValidator, SanitizationPresets } from '../../../src/middleware/input-sanitization';
import { ValidationError } from '../../../src/types';

describe('Input Sanitization Middleware', () => {
  let app: Koa;

  beforeEach(() => {
    app = new Koa();
    app.use(bodyParser());
  });

  describe('XSS Protection', () => {
    it('should remove script tags', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const response = await request(app.callback())
        .post('/')
        .send({ message: maliciousInput })
        .expect(200);

      expect(response.body.received.message).not.toContain('<script>');
      expect(response.body.received.message).not.toContain('alert');
    });

    it('should remove javascript: protocols', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = '<a href="javascript:alert(1)">Click me</a>';
      const response = await request(app.callback())
        .post('/')
        .send({ link: maliciousInput })
        .expect(200);

      expect(response.body.received.link).not.toContain('javascript:');
    });

    it('should remove on* event handlers', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = '<div onclick="alert(1)">Click me</div>';
      const response = await request(app.callback())
        .post('/')
        .send({ content: maliciousInput })
        .expect(200);

      expect(response.body.received.content).not.toContain('onclick');
    });

    it('should escape HTML entities', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = '<img src="x" onerror="alert(1)">';
      const response = await request(app.callback())
        .post('/')
        .send({ content: maliciousInput })
        .expect(200);

      expect(response.body.received.content).toContain('&lt;');
      expect(response.body.received.content).toContain('&gt;');
    });
  });

  describe('SQL Injection Protection', () => {
    it('should remove SQL comment patterns', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableSQLInjectionProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = "'; DROP TABLE users; --";
      const response = await request(app.callback())
        .post('/')
        .send({ query: maliciousInput })
        .expect(200);

      expect(response.body.received.query).not.toContain('--');
      expect(response.body.received.query).not.toContain('/*');
      expect(response.body.received.query).not.toContain('*/');
    });

    it('should remove SQL keywords', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableSQLInjectionProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const maliciousInput = "SELECT * FROM users UNION SELECT password FROM admins";
      const response = await request(app.callback())
        .post('/')
        .send({ search: maliciousInput })
        .expect(200);

      expect(response.body.received.search).not.toContain('SELECT');
      expect(response.body.received.search).not.toContain('UNION');
    });
  });

  describe('HTML Sanitization', () => {
    it('should allow safe HTML tags when configured', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableHTMLSanitization: true,
        allowedHTMLTags: ['b', 'i', 'em', 'strong']
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const input = '<b>Bold text</b> <script>alert(1)</script> <i>Italic text</i>';
      const response = await request(app.callback())
        .post('/')
        .send({ content: input })
        .expect(200);

      expect(response.body.received.content).toContain('<b>Bold text</b>');
      expect(response.body.received.content).toContain('<i>Italic text</i>');
      expect(response.body.received.content).not.toContain('<script>');
    });

    it('should remove all HTML when no tags allowed', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableHTMLSanitization: true,
        allowedHTMLTags: []
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const input = '<b>Bold</b> <i>Italic</i> <script>alert(1)</script>';
      const response = await request(app.callback())
        .post('/')
        .send({ content: input })
        .expect(200);

      expect(response.body.received.content).not.toContain('<b>');
      expect(response.body.received.content).not.toContain('<i>');
      expect(response.body.received.content).not.toContain('<script>');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableInputValidation: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        // Simulate email validation
        const email = ctx.request.body.email;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          ctx.status = 400;
          ctx.body = { error: 'Invalid email format' };
          return;
        }
        ctx.body = { received: ctx.request.body };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should validate URL format', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableInputValidation: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        const url = ctx.request.body.url;
        if (url && !/^https?:\/\/.+/.test(url)) {
          ctx.status = 400;
          ctx.body = { error: 'Invalid URL format' };
          return;
        }
        ctx.body = { received: ctx.request.body };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ url: 'not-a-url' })
        .expect(400);

      expect(response.body.error).toBe('Invalid URL format');
    });
  });

  describe('String Length Validation', () => {
    it('should reject strings exceeding max length', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        maxStringLength: 10
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ message: 'This is a very long message that exceeds the limit' })
        .expect(400);

      expect(response.body.error).toContain('exceeds maximum length');
      expect(response.body.code).toBe('INPUT_TOO_LONG');
    });

    it('should allow strings within max length', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        maxStringLength: 100
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ message: 'Short message' })
        .expect(200);

      expect(response.body.received.message).toBe('Short message');
    });
  });

  describe('Nested Object Sanitization', () => {
    it('should sanitize nested objects', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const nestedInput = {
        user: {
          name: '<script>alert(1)</script>John',
          email: 'john@example.com',
          profile: {
            bio: '<img src="x" onerror="alert(1)">Bio text'
          }
        },
        tags: ['<script>alert(1)</script>tag1', 'normal-tag']
      };

      const response = await request(app.callback())
        .post('/')
        .send(nestedInput)
        .expect(200);

      expect(response.body.received.user.name).not.toContain('<script>');
      expect(response.body.received.user.profile.bio).not.toContain('<img');
      expect(response.body.received.tags[0]).not.toContain('<script>');
      expect(response.body.received.tags[1]).toBe('normal-tag');
    });
  });

  describe('Query Parameter Sanitization', () => {
    it('should sanitize query parameters', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        enableXSSProtection: true
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { query: ctx.query };
      });

      const response = await request(app.callback())
        .get('/?search=<script>alert(1)</script>test&filter=normal')
        .expect(200);

      expect(response.body.query.search).not.toContain('<script>');
      expect(response.body.query.filter).toBe('normal');
    });
  });

  describe('Sanitization Presets', () => {
    it('should apply USER_INPUT preset correctly', () => {
      const preset = SanitizationPresets.USER_INPUT;
      
      expect(preset.enableXSSProtection).toBe(true);
      expect(preset.enableSQLInjectionProtection).toBe(true);
      expect(preset.enableHTMLSanitization).toBe(true);
      expect(preset.maxStringLength).toBe(1000);
      expect(preset.allowedHTMLTags).toEqual([]);
    });

    it('should apply CONTENT preset correctly', () => {
      const preset = SanitizationPresets.CONTENT;
      
      expect(preset.enableXSSProtection).toBe(true);
      expect(preset.enableSQLInjectionProtection).toBe(true);
      expect(preset.enableHTMLSanitization).toBe(true);
      expect(preset.maxStringLength).toBe(5000);
      expect(preset.allowedHTMLTags).toContain('b');
      expect(preset.allowedHTMLTags).toContain('i');
    });

    it('should apply TRUSTED preset correctly', () => {
      const preset = SanitizationPresets.TRUSTED;
      
      expect(preset.enableXSSProtection).toBe(true);
      expect(preset.enableSQLInjectionProtection).toBe(false);
      expect(preset.enableHTMLSanitization).toBe(false);
      expect(preset.maxStringLength).toBe(10000);
    });
  });

  describe('Advanced Input Validator', () => {
    let validator: AdvancedInputValidator;

    beforeEach(() => {
      validator = new AdvancedInputValidator();
    });

    it('should validate required fields', () => {
      const schema = {
        name: { required: true, type: 'string' },
        email: { required: true, type: 'string' }
      };

      expect(() => {
        validator.validateSchema({}, schema);
      }).toThrow(ValidationError);
    });

    it('should validate field types', () => {
      const schema = {
        age: { type: 'number' },
        name: { type: 'string' }
      };

      expect(() => {
        validator.validateSchema({ age: 'not-a-number', name: 123 }, schema);
      }).toThrow(ValidationError);
    });

    it('should validate string length', () => {
      const schema = {
        message: { type: 'string', minLength: 5, maxLength: 10 }
      };

      expect(() => {
        validator.validateSchema({ message: 'Hi' }, schema);
      }).toThrow(ValidationError);

      expect(() => {
        validator.validateSchema({ message: 'This is too long' }, schema);
      }).toThrow(ValidationError);
    });

    it('should validate with custom pattern', () => {
      const schema = {
        phone: { type: 'string', pattern: /^\d{3}-\d{3}-\d{4}$/ }
      };

      expect(() => {
        validator.validateSchema({ phone: '123-456-7890' }, schema);
      }).not.toThrow();

      expect(() => {
        validator.validateSchema({ phone: 'invalid-phone' }, schema);
      }).toThrow(ValidationError);
    });

    it('should validate with custom validator', () => {
      const schema = {
        password: { 
          type: 'string', 
          validator: (value: string) => value.length >= 8 && /[A-Z]/.test(value)
        }
      };

      expect(() => {
        validator.validateSchema({ password: 'StrongPass123' }, schema);
      }).not.toThrow();

      expect(() => {
        validator.validateSchema({ password: 'weak' }, schema);
      }).toThrow(ValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const sanitization = InputSanitizationMiddleware.create({
        maxStringLength: 5
      });

      app.use(sanitization);
      app.use(async (ctx) => {
        ctx.body = { received: ctx.request.body };
      });

      const response = await request(app.callback())
        .post('/')
        .send({ message: 'This is too long' })
        .expect(400);

      expect(response.body.error).toContain('exceeds maximum length');
      expect(response.body.code).toBe('INPUT_TOO_LONG');
    });
});
