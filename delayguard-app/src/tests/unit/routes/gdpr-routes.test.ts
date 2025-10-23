/**
 * GDPR Routes Tests
 * Tests for GDPR webhook endpoints
 */

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import request from 'supertest';
import crypto from 'crypto';
import { gdprRoutes } from '../../../routes/gdpr';
import { gdprService } from '../../../services/gdpr-service';
import type { GDPRCustomerData } from '../../../types';

// Mock the GDPR service
jest.mock('../../../services/gdpr-service');
jest.mock('../../../utils/logger');

const mockGdprService = gdprService as jest.Mocked<typeof gdprService>;

describe('GDPR Routes', () => {
  let app: Koa;
  let server: ReturnType<typeof request>;

  beforeEach(() => {
    // Set up test app
    app = new Koa();
    
    // Add raw body middleware for HMAC verification
    app.use(async(ctx, next) => {
      if (ctx.request.body) {
        ctx.request.rawBody = JSON.stringify(ctx.request.body);
      }
      await next();
    });
    
    app.use(bodyParser());
    app.use(gdprRoutes.routes());
    app.use(gdprRoutes.allowedMethods());

    server = request(app.callback());

    // Set environment variable for testing
    process.env.SHOPIFY_API_SECRET = 'test-secret';

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SHOPIFY_API_SECRET;
  });

  /**
   * Generate HMAC signature for testing
   */
  function generateHMAC(data: string): string {
    return crypto
      .createHmac('sha256', 'test-secret')
      .update(data, 'utf8')
      .digest('base64');
  }

  describe('POST /gdpr/customers/data_request', () => {
    it('should process valid data request webhook', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [1001, 1002],
        customer: {
          id: 456,
          email: 'customer@example.com',
          phone: '+1234567890',
        },
        data_request: {
          id: 789,
        },
      };

      const mockCustomerData: GDPRCustomerData = {
        customer_id: '456',
        email: 'customer@example.com',
        phone: '+1234567890',
        orders: [],
        alerts: [],
        fulfillments: [],
      };

      mockGdprService.handleDataRequest.mockResolvedValue(mockCustomerData);

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/customers/data_request')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCustomerData);
      expect(mockGdprService.handleDataRequest).toHaveBeenCalledWith(webhookData);
    });

    it('should reject request with invalid HMAC', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [],
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        data_request: {
          id: 789,
        },
      };

      const response = await server
        .post('/gdpr/customers/data_request')
        .set('X-Shopify-Hmac-Sha256', 'invalid-hmac')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(mockGdprService.handleDataRequest).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [],
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        data_request: {
          id: 789,
        },
      };

      mockGdprService.handleDataRequest.mockRejectedValue(
        new Error('Database error'),
      );

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/customers/data_request')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /gdpr/customers/redact', () => {
    it('should process valid customer redaction webhook', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
          phone: '+1234567890',
        },
        orders_to_redact: [1001, 1002],
      };

      mockGdprService.handleCustomerRedact.mockResolvedValue();

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/customers/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Customer data redaction completed');
      expect(mockGdprService.handleCustomerRedact).toHaveBeenCalledWith(webhookData);
    });

    it('should reject request with invalid HMAC', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        orders_to_redact: [],
      };

      const response = await server
        .post('/gdpr/customers/redact')
        .set('X-Shopify-Hmac-Sha256', 'invalid-hmac')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(mockGdprService.handleCustomerRedact).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        orders_to_redact: [],
      };

      mockGdprService.handleCustomerRedact.mockRejectedValue(
        new Error('Redaction failed'),
      );

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/customers/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /gdpr/shop/redact', () => {
    it('should process valid shop redaction webhook', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      mockGdprService.handleShopRedact.mockResolvedValue();

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Shop data redaction completed');
      expect(mockGdprService.handleShopRedact).toHaveBeenCalledWith(webhookData);
    });

    it('should reject request with invalid HMAC', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      const response = await server
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', 'invalid-hmac')
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(mockGdprService.handleShopRedact).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      mockGdprService.handleShopRedact.mockRejectedValue(
        new Error('Deletion failed'),
      );

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('HMAC Verification', () => {
    it('should verify valid HMAC correctly', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      mockGdprService.handleShopRedact.mockResolvedValue();

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      const response = await server
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(200);
    });

    it('should reject tampered data', async() => {
      const webhookData = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      const body = JSON.stringify(webhookData);
      const hmac = generateHMAC(body);

      // Tamper with the data
      webhookData.shop_id = 999;

      const response = await server
        .post('/gdpr/shop/redact')
        .set('X-Shopify-Hmac-Sha256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-shop.myshopify.com')
        .send(webhookData);

      expect(response.status).toBe(401);
    });
  });
});

