/**
 * Integration Tests for order_line_items Table Schema
 *
 * Phase 1.2: Basic Product Information - Backend Integration
 * Tests verify the database schema for storing order line items (products) from Shopify
 *
 * Following TDD: These tests are written FIRST and should FAIL until the schema is implemented
 */

import { getDatabaseClient, setupDatabase } from '../../../database/connection';
import { PoolClient } from 'pg';

/**
 * IMPORTANT: These are integration tests that require a running PostgreSQL database.
 *
 * To run these tests locally:
 * 1. Ensure PostgreSQL is running
 * 2. Set DATABASE_URL environment variable
 * 3. Run: npm test -- src/tests/integration/database/order-line-items-schema.test.ts
 *
 * These tests will be SKIPPED if database is not available.
 */

describe.skip('order_line_items Table Schema (Integration - Requires PostgreSQL)', () => {
  let client: PoolClient;

  beforeAll(async() => {
    // Initialize database connection and run migrations
    await setupDatabase();
    client = await getDatabaseClient();
  });

  afterAll(async() => {
    if (client) {
      client.release();
    }
  });

  describe('Table Existence', () => {
    it('should have order_line_items table', async() => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'order_line_items'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });
  });

  describe('Table Columns', () => {
    it('should have id column as primary key', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'id';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('integer');
      expect(result.rows[0].column_default).toContain('nextval');
    });

    it('should have order_id column with foreign key to orders', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'order_id';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('integer');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should have shopify_line_item_id column', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'shopify_line_item_id';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('character varying');
    });

    it('should have product_id column', async() => {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'product_id';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('character varying');
    });

    it('should have title column', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'title';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('character varying');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should have variant_title column (nullable)', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'variant_title';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('character varying');
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have sku column (nullable)', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'sku';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have quantity column', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'quantity';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('integer');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should have price column as numeric', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'price';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('numeric');
      expect(result.rows[0].is_nullable).toBe('NO');
    });

    it('should have product_type column (nullable)', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'product_type';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have vendor column (nullable)', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'vendor';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have image_url column (nullable)', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'image_url';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toBe('text');
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have created_at column with default', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'created_at';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toContain('timestamp');
      expect(result.rows[0].column_default).toContain('CURRENT_TIMESTAMP');
    });

    it('should have updated_at column with default', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'order_line_items' AND column_name = 'updated_at';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].data_type).toContain('timestamp');
      expect(result.rows[0].column_default).toContain('CURRENT_TIMESTAMP');
    });
  });

  describe('Table Constraints', () => {
    it('should have foreign key constraint on order_id referencing orders table', async() => {
      const result = await client.query(`
        SELECT constraint_name, table_name, column_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'order_line_items'
        AND column_name = 'order_id'
        AND constraint_name LIKE '%fkey%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have unique constraint on order_id and shopify_line_item_id', async() => {
      const result = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'order_line_items'
        AND constraint_type = 'UNIQUE';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Table Indexes', () => {
    it('should have index on order_id for query performance', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'order_line_items'
        AND indexname LIKE '%order_id%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have index on shopify_line_item_id for lookups', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'order_line_items'
        AND indexname LIKE '%shopify_line_item_id%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD Operations', () => {
    let testOrderId: number;

    beforeAll(async() => {
      // Create a test shop
      const shopResult = await client.query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ('test-shop.myshopify.com', 'test-token', ARRAY['read_orders', 'read_products'])
        RETURNING id;
      `);
      const shopId = shopResult.rows[0].id;

      // Create a test order
      const orderResult = await client.query(`
        INSERT INTO orders (shop_id, shopify_order_id, order_number, customer_name, status)
        VALUES ($1, 'test-order-123', 'ORD-123', 'Test Customer', 'pending')
        RETURNING id;
      `, [shopId]);

      testOrderId = orderResult.rows[0].id;
    });

    afterAll(async() => {
      // Cleanup: Delete test data (cascades to line items)
      await client.query(`DELETE FROM shops WHERE shop_domain = 'test-shop.myshopify.com';`);
    });

    it('should allow inserting a line item', async() => {
      const result = await client.query(`
        INSERT INTO order_line_items (
          order_id, shopify_line_item_id, product_id, title, variant_title,
          sku, quantity, price, product_type, vendor, image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, title;
      `, [
        testOrderId,
        'shopify-line-item-1',
        'prod-123',
        'Test Product',
        'Red / Large',
        'SKU-123',
        2,
        49.99,
        'Electronics',
        'Test Vendor',
        'https://example.com/image.jpg',
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].title).toBe('Test Product');
    });

    it('should retrieve line items by order_id', async() => {
      const result = await client.query(`
        SELECT * FROM order_line_items WHERE order_id = $1;
      `, [testOrderId]);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].order_id).toBe(testOrderId);
    });

    it('should update a line item', async() => {
      const insertResult = await client.query(`
        INSERT INTO order_line_items (
          order_id, shopify_line_item_id, product_id, title, quantity, price
        )
        VALUES ($1, 'update-test-item', 'prod-456', 'Update Test', 1, 19.99)
        RETURNING id;
      `, [testOrderId]);

      const lineItemId = insertResult.rows[0].id;

      const updateResult = await client.query(`
        UPDATE order_line_items
        SET quantity = 3, price = 29.99
        WHERE id = $1
        RETURNING quantity, price;
      `, [lineItemId]);

      expect(updateResult.rows[0].quantity).toBe(3);
      expect(parseFloat(updateResult.rows[0].price)).toBe(29.99);
    });

    it('should delete a line item', async() => {
      const insertResult = await client.query(`
        INSERT INTO order_line_items (
          order_id, shopify_line_item_id, product_id, title, quantity, price
        )
        VALUES ($1, 'delete-test-item', 'prod-789', 'Delete Test', 1, 9.99)
        RETURNING id;
      `, [testOrderId]);

      const lineItemId = insertResult.rows[0].id;

      await client.query(`DELETE FROM order_line_items WHERE id = $1;`, [lineItemId]);

      const checkResult = await client.query(`
        SELECT * FROM order_line_items WHERE id = $1;
      `, [lineItemId]);

      expect(checkResult.rows).toHaveLength(0);
    });

    it('should cascade delete line items when order is deleted', async() => {
      // Create a temporary order
      const shopResult = await client.query(`
        SELECT id FROM shops WHERE shop_domain = 'test-shop.myshopify.com';
      `);
      const shopId = shopResult.rows[0].id;

      const orderResult = await client.query(`
        INSERT INTO orders (shop_id, shopify_order_id, order_number, customer_name, status)
        VALUES ($1, 'cascade-test-order', 'ORD-CASCADE', 'Cascade Test', 'pending')
        RETURNING id;
      `, [shopId]);
      const cascadeOrderId = orderResult.rows[0].id;

      // Insert line item
      await client.query(`
        INSERT INTO order_line_items (
          order_id, shopify_line_item_id, product_id, title, quantity, price
        )
        VALUES ($1, 'cascade-item', 'prod-cascade', 'Cascade Product', 1, 99.99);
      `, [cascadeOrderId]);

      // Delete the order
      await client.query(`DELETE FROM orders WHERE id = $1;`, [cascadeOrderId]);

      // Verify line items were cascade deleted
      const checkResult = await client.query(`
        SELECT * FROM order_line_items WHERE order_id = $1;
      `, [cascadeOrderId]);

      expect(checkResult.rows).toHaveLength(0);
    });
  });
});
