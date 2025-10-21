/**
 * GDPR Service Tests
 * Tests for GDPR compliance webhooks and data handling
 * Following Shopify GDPR requirements
 */

import { GDPRService } from '../../../services/gdpr-service';
import { query } from '../../../database/connection';
import { logger } from '../../../utils/logger';
import type {
  GDPRDataRequestWebhook,
  GDPRCustomerRedactWebhook,
  GDPRShopRedactWebhook,
  GDPRCustomerData,
} from '../../../types';

// Mock dependencies
jest.mock('../../../database/connection');
jest.mock('../../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GDPRService', () => {
  let gdprService: GDPRService;

  beforeEach(() => {
    gdprService = new GDPRService();
    jest.clearAllMocks();
  });

  describe('handleDataRequest', () => {
    it('should retrieve all customer data successfully', async () => {
      const webhook: GDPRDataRequestWebhook = {
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

      // Mock database responses
      mockQuery
        .mockResolvedValueOnce([
          {
            order_id: '1001',
            order_number: 'ORD-001',
            created_at: '2024-01-01T00:00:00Z',
            total_amount: 99.99,
          },
        ])
        .mockResolvedValueOnce([
          {
            alert_id: 'alert-1',
            created_at: '2024-01-02T00:00:00Z',
            delay_days: 3,
            status: 'active',
          },
        ])
        .mockResolvedValueOnce([
          {
            tracking_number: 'TRACK123',
            carrier: 'UPS',
            created_at: '2024-01-01T00:00:00Z',
          },
        ]);

      const result = await gdprService.handleDataRequest(webhook);

      expect(result).toEqual({
        customer_id: '456',
        email: 'customer@example.com',
        phone: '+1234567890',
        orders: [
          {
            order_id: '1001',
            order_number: 'ORD-001',
            created_at: '2024-01-01T00:00:00Z',
            total_amount: 99.99,
          },
        ],
        alerts: [
          {
            alert_id: 'alert-1',
            created_at: '2024-01-02T00:00:00Z',
            delay_days: 3,
            status: 'active',
          },
        ],
        fulfillments: [
          {
            tracking_number: 'TRACK123',
            carrier: 'UPS',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      });

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GDPR data request processed'),
        expect.any(Object)
      );
    });

    it('should handle customer with no data', async () => {
      const webhook: GDPRDataRequestWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [],
        customer: {
          id: 456,
          email: 'newcustomer@example.com',
        },
        data_request: {
          id: 789,
        },
      };

      mockQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await gdprService.handleDataRequest(webhook);

      expect(result.orders).toEqual([]);
      expect(result.alerts).toEqual([]);
      expect(result.fulfillments).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const webhook: GDPRDataRequestWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [1001],
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        data_request: {
          id: 789,
        },
      };

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(gdprService.handleDataRequest(webhook)).rejects.toThrow(
        'Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing GDPR data request'),
        expect.any(Error)
      );
    });
  });

  describe('handleCustomerRedact', () => {
    it('should anonymize customer data successfully', async () => {
      const webhook: GDPRCustomerRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
          phone: '+1234567890',
        },
        orders_to_redact: [1001, 1002],
      };

      mockQuery
        .mockResolvedValueOnce([{ count: 2 }]) // Update orders
        .mockResolvedValueOnce([{ count: 1 }]) // Update alerts
        .mockResolvedValueOnce([{ count: 1 }]); // Update fulfillments

      await gdprService.handleCustomerRedact(webhook);

      expect(mockQuery).toHaveBeenCalledTimes(3);
      
      // Verify customer email was anonymized
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining([
          expect.stringMatching(/redacted-customer-\d+@privacy\.invalid/),
          expect.stringMatching(/redacted-customer-\d+/),
          null,
        ])
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GDPR customer redaction completed'),
        expect.any(Object)
      );
    });

    it('should handle redaction with no orders', async () => {
      const webhook: GDPRCustomerRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        orders_to_redact: [],
      };

      mockQuery
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }]);

      await gdprService.handleCustomerRedact(webhook);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GDPR customer redaction completed'),
        expect.objectContaining({
          customer_id: 456,
          orders_redacted: 0,
        })
      );
    });

    it('should handle redaction errors', async () => {
      const webhook: GDPRCustomerRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        orders_to_redact: [1001],
      };

      mockQuery.mockRejectedValueOnce(new Error('Redaction failed'));

      await expect(gdprService.handleCustomerRedact(webhook)).rejects.toThrow(
        'Redaction failed'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('handleShopRedact', () => {
    it('should delete all shop data successfully', async () => {
      const webhook: GDPRShopRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      mockQuery
        .mockResolvedValueOnce([{ id: 'shop-uuid-123' }]) // Get shop by domain
        .mockResolvedValueOnce([{ count: 5 }]) // Delete alerts
        .mockResolvedValueOnce([{ count: 3 }]) // Delete fulfillments
        .mockResolvedValueOnce([{ count: 10 }]) // Delete orders
        .mockResolvedValueOnce([{ count: 1 }]) // Delete settings
        .mockResolvedValueOnce([{ count: 1 }]); // Delete shop

      await gdprService.handleShopRedact(webhook);

      expect(mockQuery).toHaveBeenCalledTimes(6);

      // Verify deletion order (referential integrity)
      const calls = mockQuery.mock.calls;
      expect(calls[1][0]).toContain('DELETE FROM delay_alerts');
      expect(calls[2][0]).toContain('DELETE FROM fulfillments');
      expect(calls[3][0]).toContain('DELETE FROM orders');
      expect(calls[4][0]).toContain('DELETE FROM app_settings');
      expect(calls[5][0]).toContain('DELETE FROM shops');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('GDPR shop redaction completed'),
        expect.objectContaining({
          shop_domain: 'test-shop.myshopify.com',
          alerts_deleted: 5,
          orders_deleted: 10,
        })
      );
    });

    it('should handle shop not found', async () => {
      const webhook: GDPRShopRedactWebhook = {
        shop_id: 999,
        shop_domain: 'nonexistent-shop.myshopify.com',
      };

      mockQuery.mockResolvedValueOnce([]); // Shop not found

      await gdprService.handleShopRedact(webhook);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shop not found for GDPR redaction'),
        expect.any(Object)
      );

      // Should not attempt deletions
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion errors', async () => {
      const webhook: GDPRShopRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
      };

      mockQuery
        .mockResolvedValueOnce([{ id: 'shop-uuid-123' }])
        .mockRejectedValueOnce(new Error('Deletion failed'));

      await expect(gdprService.handleShopRedact(webhook)).rejects.toThrow(
        'Deletion failed'
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('GDPR Compliance', () => {
    it('should complete data request within 30 days SLA', async () => {
      const webhook: GDPRDataRequestWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        orders_requested: [1001],
        customer: {
          id: 456,
          email: 'customer@example.com',
        },
        data_request: {
          id: 789,
        },
      };

      mockQuery
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const startTime = Date.now();
      await gdprService.handleDataRequest(webhook);
      const endTime = Date.now();

      // Should complete quickly (well within 30 days, testing < 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should anonymize PII data properly', async () => {
      const webhook: GDPRCustomerRedactWebhook = {
        shop_id: 123,
        shop_domain: 'test-shop.myshopify.com',
        customer: {
          id: 456,
          email: 'customer@example.com',
          phone: '+1234567890',
        },
        orders_to_redact: [1001],
      };

      mockQuery
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{ count: 1 }]);

      await gdprService.handleCustomerRedact(webhook);

      // Verify PII was replaced with anonymized values
      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toBeDefined();
      
      const anonymizedEmail = updateCall[1]![0] as string;
      const anonymizedName = updateCall[1]![1] as string;
      const anonymizedPhone = updateCall[1]![2];

      expect(anonymizedEmail).toMatch(/redacted-customer-\d+@privacy\.invalid/);
      expect(anonymizedName).toMatch(/redacted-customer-\d+/);
      expect(anonymizedPhone).toBeNull();
    });
  });
});

