/**
 * Shopify Service Tests (Phase 1.2)
 *
 * TDD RED PHASE - These tests are written FIRST
 *
 * Tests for Shopify GraphQL API integration:
 * - GraphQL client creation
 * - Product/line item fetching
 * - Error handling
 * - Rate limiting
 * - Data transformation
 *
 * Following MANDATORY DEVELOPMENT WORKFLOW from CLAUDE.md
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the database connection
jest.mock('../../../database/connection', () => ({
  query: jest.fn(),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock environment variables
const mockEnv = {
  SHOPIFY_API_KEY: 'test-api-key',
  SHOPIFY_API_SECRET: 'test-api-secret',
};

describe('ShopifyService - Phase 1.2 Product Information Integration', () => {
  let ShopifyService: any;
  let mockFetch: jest.Mock;

  beforeEach(async() => {
    // Reset environment
    process.env = { ...mockEnv };

    // Mock global fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch as any;

    // Clear all mocks
    jest.clearAllMocks();

    // Dynamically import to ensure mocks are applied
    ShopifyService = await import('../../../services/shopify-service');
  });

  afterEach(() => {
    jest.resetModules();
  });

  // ==========================================
  // Test Group 1: GraphQL Client Creation
  // ==========================================

  describe('GraphQL Client Creation', () => {
    it('should create a GraphQL client for a shop with valid access token', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';

      const client = await ShopifyService.createGraphQLClient(shopDomain, accessToken);

      expect(client).toBeDefined();
      expect(client).toHaveProperty('query');
      expect(typeof client.query).toBe('function');
    });

    it('should throw error when shop domain is missing', async() => {
      await expect(
        ShopifyService.createGraphQLClient('', 'test-token'),
      ).rejects.toThrow('Shop domain is required');
    });

    it('should throw error when access token is missing', async() => {
      await expect(
        ShopifyService.createGraphQLClient('test-shop.myshopify.com', ''),
      ).rejects.toThrow('Access token is required');
    });

    it('should normalize shop domain to include .myshopify.com', async() => {
      const client1 = await ShopifyService.createGraphQLClient('test-shop', 'token');
      const client2 = await ShopifyService.createGraphQLClient('test-shop.myshopify.com', 'token');

      // Both should work the same way
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });
  });

  // ==========================================
  // Test Group 2: Fetch Order Line Items
  // ==========================================

  describe('Fetch Order Line Items', () => {
    const mockOrderResponse = {
      data: {
        order: {
          id: 'gid://shopify/Order/123456789',
          lineItems: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/LineItem/111',
                  title: 'Wireless Bluetooth Headphones',
                  variantTitle: 'Black / Medium',
                  quantity: 2,
                  originalUnitPrice: '89.99',
                  image: {
                    url: 'https://cdn.shopify.com/s/files/1/0001/0001/products/headphones.jpg',
                    altText: 'Wireless headphones in black',
                  },
                  product: {
                    id: 'gid://shopify/Product/999',
                    productType: 'Electronics',
                    vendor: 'TechCorp',
                  },
                  sku: 'WBH-BLK-M',
                },
              },
              {
                node: {
                  id: 'gid://shopify/LineItem/222',
                  title: 'USB-C Charging Cable',
                  variantTitle: null,
                  quantity: 1,
                  originalUnitPrice: '19.99',
                  image: null,
                  product: {
                    id: 'gid://shopify/Product/888',
                    productType: 'Accessories',
                    vendor: 'TechCorp',
                  },
                  sku: 'USBC-CABLE-1M',
                },
              },
            ],
          },
        },
      },
    };

    beforeEach(() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => mockOrderResponse,
      });
    });

    it('should fetch order line items from Shopify GraphQL API', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = '123456789';

      const lineItems = await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      expect(lineItems).toBeDefined();
      expect(Array.isArray(lineItems)).toBe(true);
      expect(lineItems.length).toBe(2);
    });

    it('should correctly transform line item data to internal format', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = '123456789';

      const lineItems = await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      const firstItem = lineItems[0];
      expect(firstItem).toMatchObject({
        shopifyLineItemId: 'gid://shopify/LineItem/111',
        productId: 'gid://shopify/Product/999',
        title: 'Wireless Bluetooth Headphones',
        variantTitle: 'Black / Medium',
        sku: 'WBH-BLK-M',
        quantity: 2,
        price: 89.99,
        productType: 'Electronics',
        vendor: 'TechCorp',
        imageUrl: 'https://cdn.shopify.com/s/files/1/0001/0001/products/headphones.jpg',
      });
    });

    it('should handle line items with null/missing optional fields', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = '123456789';

      const lineItems = await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      const secondItem = lineItems[1];
      expect(secondItem.variantTitle).toBeNull();
      expect(secondItem.imageUrl).toBeNull();
    });

    it('should call Shopify GraphQL API with correct query and variables', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = '123456789';

      await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0] as [string, any];
      expect(url).toContain('test-shop.myshopify.com');
      expect(url).toContain('/admin/api/');
      expect(url).toContain('/graphql.json');

      expect(options.method).toBe('POST');
      expect(options.headers['X-Shopify-Access-Token']).toBe('test-access-token');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.query).toContain('query GetOrderWithProducts');
      expect(body.variables.orderId).toBe('gid://shopify/Order/123456789');
    });

    it('should convert numeric order IDs to Shopify GID format', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = '123456789'; // Numeric ID

      await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      const [, options] = mockFetch.mock.calls[0] as [string, any];
      const body = JSON.parse(options.body);

      // Should convert to GID format
      expect(body.variables.orderId).toBe('gid://shopify/Order/123456789');
    });

    it('should handle GID format order IDs correctly', async() => {
      const shopDomain = 'test-shop.myshopify.com';
      const accessToken = 'test-access-token';
      const shopifyOrderId = 'gid://shopify/Order/123456789'; // Already GID format

      await ShopifyService.fetchOrderLineItems(
        shopDomain,
        accessToken,
        shopifyOrderId,
      );

      const [, options] = mockFetch.mock.calls[0] as [string, any];
      const body = JSON.parse(options.body);

      // Should use as-is
      expect(body.variables.orderId).toBe('gid://shopify/Order/123456789');
    });

    it('should return empty array if order has no line items', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123456789',
              lineItems: {
                edges: [],
              },
            },
          },
        }),
      });

      const lineItems = await ShopifyService.fetchOrderLineItems(
        'test-shop.myshopify.com',
        'test-token',
        '123456789',
      );

      expect(lineItems).toEqual([]);
    });

    it('should return empty array if order is not found', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: null,
          },
        }),
      });

      const lineItems = await ShopifyService.fetchOrderLineItems(
        'test-shop.myshopify.com',
        'test-token',
        '999999999',
      );

      expect(lineItems).toEqual([]);
    });
  });

  // ==========================================
  // Test Group 3: Error Handling
  // ==========================================

  describe('Error Handling', () => {
    it('should throw error when Shopify API returns HTTP error', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow('Shopify API error');
    });

    it('should throw error when Shopify API returns 401 Unauthorized', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'invalid-token', '123'),
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error when Shopify API returns GraphQL errors', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          errors: [
            {
              message: 'Field "order" doesn\'t exist on type "QueryRoot"',
              locations: [{ line: 2, column: 3 }],
            },
          ],
        }),
      });

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow('GraphQL error');
    });

    it('should handle network errors gracefully', async() => {
      (mockFetch as any).mockRejectedValue(new Error('Network error: Failed to fetch'));

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON responses', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => {
          throw new SyntaxError('Unexpected token');
        },
      });

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // Test Group 4: Rate Limiting
  // ==========================================

  describe('Rate Limiting and Throttling', () => {
    it('should respect Shopify API rate limit headers', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string) => {
            if (name === 'X-Shopify-Shop-Api-Call-Limit') return '39/40';
            return null;
          },
        },
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: { edges: [] },
            },
          },
        }),
      });

      await ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123');

      // Should not throw even when near rate limit
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle rate limit exceeded (429) response', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => {
            if (name === 'Retry-After') return '2';
            return null;
          },
        },
      });

      await expect(
        ShopifyService.fetchOrderLineItems('test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  // ==========================================
  // Test Group 5: Data Validation
  // ==========================================

  describe('Data Validation and Transformation', () => {
    it('should parse price strings to numbers correctly', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test Product',
                      quantity: 1,
                      originalUnitPrice: '99.95',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test Vendor',
                      },
                      sku: 'TEST-SKU',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      const lineItems = await ShopifyService.fetchOrderLineItems(
        'test-shop.myshopify.com',
        'token',
        '123',
      );

      expect(lineItems[0].price).toBe(99.95);
      expect(typeof lineItems[0].price).toBe('number');
    });

    it('should handle different price formats', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test Product',
                      quantity: 1,
                      originalUnitPrice: '1234.56',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test',
                      },
                      sku: 'TEST',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      const lineItems = await ShopifyService.fetchOrderLineItems(
        'test-shop.myshopify.com',
        'token',
        '123',
      );

      expect(lineItems[0].price).toBe(1234.56);
    });

    it('should validate required fields are present', async() => {
      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test Product',
                      quantity: 1,
                      originalUnitPrice: '99.99',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test',
                      },
                      sku: 'TEST-SKU',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      const lineItems = await ShopifyService.fetchOrderLineItems(
        'test-shop.myshopify.com',
        'token',
        '123',
      );

      const item = lineItems[0];
      expect(item).toHaveProperty('shopifyLineItemId');
      expect(item).toHaveProperty('productId');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('price');
    });
  });

  // ==========================================
  // Test Group 6: Integration with Database
  // ==========================================

  describe('Database Integration', () => {
    it('should save line items to database after fetching from Shopify', async() => {
      const { query } = await import('../../../database/connection');
      const mockQuery = query as jest.Mock;

      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test Product',
                      quantity: 1,
                      originalUnitPrice: '99.99',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test',
                      },
                      sku: 'TEST-SKU',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      await ShopifyService.saveOrderLineItems(1, 'test-shop.myshopify.com', 'token', '123');

      expect(mockQuery).toHaveBeenCalled();

      // Should have called INSERT query
      const insertCall = mockQuery.mock.calls.find((call: any) =>
        call[0].includes('INSERT INTO order_line_items'),
      );
      expect(insertCall).toBeDefined();
    });

    it('should handle database errors gracefully when saving line items', async() => {
      const { query } = await import('../../../database/connection');
      const mockQuery = query as jest.Mock;

      (mockQuery as any).mockRejectedValueOnce(new Error('Database connection failed'));

      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test',
                      quantity: 1,
                      originalUnitPrice: '99.99',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test',
                      },
                      sku: 'TEST',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      await expect(
        ShopifyService.saveOrderLineItems(1, 'test-shop.myshopify.com', 'token', '123'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should use UPSERT (ON CONFLICT) when saving line items', async() => {
      const { query } = await import('../../../database/connection');
      const mockQuery = query as jest.Mock;

      (mockFetch as any).mockResolvedValue({
        ok: true,
        json: async() => ({
          data: {
            order: {
              id: 'gid://shopify/Order/123',
              lineItems: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/LineItem/111',
                      title: 'Test',
                      quantity: 1,
                      originalUnitPrice: '99.99',
                      product: {
                        id: 'gid://shopify/Product/999',
                        productType: 'Test',
                        vendor: 'Test',
                      },
                      sku: 'TEST',
                    },
                  },
                ],
              },
            },
          },
        }),
      });

      await ShopifyService.saveOrderLineItems(1, 'test-shop.myshopify.com', 'token', '123');

      const insertCall = mockQuery.mock.calls.find((call: any) =>
        call[0].includes('ON CONFLICT'),
      );
      expect(insertCall).toBeDefined();
    });
  });
});
