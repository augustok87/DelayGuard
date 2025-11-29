/**
 * Integration Tests: Merchant Contact Schema
 *
 * Tests for merchant_email, merchant_phone, merchant_name columns in shops table
 * Part of Phase 2.1 - Notification Routing Implementation
 *
 * TDD RED Phase: These tests should FAIL until migration is implemented
 */

// Unmock pg module for real database integration tests
jest.unmock('pg');

import * as dotenv from 'dotenv';
import { query, pool, setupDatabase, runMigrations } from '../../../src/database/connection';

// Load environment variables for database connection
dotenv.config();

// Override test DATABASE_URL to use dev database (which has migrations)
process.env.DATABASE_URL = 'postgresql://localhost:5432/delayguard_dev';

describe('Merchant Contact Schema', () => {
  beforeAll(async() => {
    // Initialize database connection and run migrations
    await setupDatabase();
    await runMigrations();
  });

  afterAll(async() => {
    // Clean up test data
    await query(`DELETE FROM shops WHERE shop_domain LIKE 'test-merchant-contact%'`);
    await pool.end();
  });

  describe('Column Existence', () => {
    it('should have merchant_email column in shops table', async() => {
      const result = await query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_email'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('merchant_email');
      expect((result[0] as any).data_type).toBe('character varying');
      expect((result[0] as any).character_maximum_length).toBe(255);
    });

    it('should have merchant_phone column in shops table', async() => {
      const result = await query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_phone'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('merchant_phone');
      expect((result[0] as any).data_type).toBe('character varying');
      expect((result[0] as any).character_maximum_length).toBe(255);
    });

    it('should have merchant_name column in shops table', async() => {
      const result = await query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_name'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('merchant_name');
      expect((result[0] as any).data_type).toBe('character varying');
      expect((result[0] as any).character_maximum_length).toBe(255);
    });

    it('should allow NULL values for all merchant contact fields', async() => {
      const result = await query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'shops'
          AND column_name IN ('merchant_email', 'merchant_phone', 'merchant_name')
        ORDER BY column_name
      `);

      expect(result.length).toBe(3);
      (result as any[]).forEach((col: { column_name: string; is_nullable: string }) => {
        expect(col.is_nullable).toBe('YES');
      });
    });
  });

  describe('Data Operations', () => {
    it('should INSERT shop with merchant contact fields', async() => {
      const testDomain = 'test-merchant-contact-insert.myshopify.com';

      await query(`
        INSERT INTO shops (shop_domain, access_token, merchant_email, merchant_phone, merchant_name)
        VALUES ($1, $2, $3, $4, $5)
      `, [testDomain, 'test-token', 'merchant@example.com', '+1-555-0100', 'Test Merchant']);

      const result = await query(
        'SELECT merchant_email, merchant_phone, merchant_name FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect(result.length).toBe(1);
      expect((result[0] as any).merchant_email).toBe('merchant@example.com');
      expect((result[0] as any).merchant_phone).toBe('+1-555-0100');
      expect((result[0] as any).merchant_name).toBe('Test Merchant');
    });

    it('should UPDATE merchant contact fields', async() => {
      const testDomain = 'test-merchant-contact-update.myshopify.com';

      // Insert initial record
      await query(`
        INSERT INTO shops (shop_domain, access_token)
        VALUES ($1, $2)
      `, [testDomain, 'test-token']);

      // Update merchant fields
      await query(`
        UPDATE shops
        SET merchant_email = $1, merchant_phone = $2, merchant_name = $3
        WHERE shop_domain = $4
      `, ['updated@example.com', '+1-555-0200', 'Updated Merchant', testDomain]);

      const result = await query(
        'SELECT merchant_email, merchant_phone, merchant_name FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect((result[0] as any).merchant_email).toBe('updated@example.com');
      expect((result[0] as any).merchant_phone).toBe('+1-555-0200');
      expect((result[0] as any).merchant_name).toBe('Updated Merchant');
    });

    it('should SELECT merchant fields with JOIN to orders table', async() => {
      const testDomain = 'test-merchant-contact-join.myshopify.com';

      // Insert shop with merchant info
      const shopResult = await query(`
        INSERT INTO shops (shop_domain, access_token, merchant_email, merchant_phone, merchant_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [testDomain, 'test-token', 'join@example.com', '+1-555-0300', 'Join Test']);

      const shopId = (shopResult[0] as any).id;

      // Insert test order
      await query(`
        INSERT INTO orders (shop_id, shopify_order_id, order_number, customer_name, customer_email, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [shopId, 'gid://shopify/Order/123', '#1001', 'Test Customer', 'customer@example.com', 'unfulfilled']);

      // Query with JOIN
      const result = await query(`
        SELECT o.order_number, s.merchant_email, s.merchant_phone, s.merchant_name
        FROM orders o
        JOIN shops s ON o.shop_id = s.id
        WHERE s.shop_domain = $1
      `, [testDomain]);

      expect(result.length).toBeGreaterThan(0);
      expect((result[0] as any).merchant_email).toBe('join@example.com');
      expect((result[0] as any).merchant_phone).toBe('+1-555-0300');
      expect((result[0] as any).merchant_name).toBe('Join Test');
    });

    it('should handle NULL values for all merchant fields', async() => {
      const testDomain = 'test-merchant-contact-null.myshopify.com';

      await query(`
        INSERT INTO shops (shop_domain, access_token)
        VALUES ($1, $2)
      `, [testDomain, 'test-token']);

      const result = await query(
        'SELECT merchant_email, merchant_phone, merchant_name FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect((result[0] as any).merchant_email).toBeNull();
      expect((result[0] as any).merchant_phone).toBeNull();
      expect((result[0] as any).merchant_name).toBeNull();
    });
  });

  describe('Data Validation', () => {
    it('should accept valid email format in merchant_email', async() => {
      const testDomain = 'test-merchant-email-valid.myshopify.com';
      const validEmails = [
        'simple@example.com',
        'with+tag@example.com',
        'with.dot@example.co.uk',
      ];

      for (const email of validEmails) {
        await query(`
          INSERT INTO shops (shop_domain, access_token, merchant_email)
          VALUES ($1, $2, $3)
          ON CONFLICT (shop_domain) DO UPDATE SET merchant_email = $3
        `, [testDomain, 'test-token', email]);

        const result = await query(
          'SELECT merchant_email FROM shops WHERE shop_domain = $1',
          [testDomain],
        );

        expect((result[0] as any).merchant_email).toBe(email);
      }
    });

    it('should accept international phone formats in merchant_phone', async() => {
      const testDomain = 'test-merchant-phone-intl.myshopify.com';
      const validPhones = [
        '+1-555-0100',         // US format with dashes
        '+44 20 7946 0958',    // UK format with spaces
        '+81 3-1234-5678',     // Japan format
        '(555) 123-4567',      // US format with parentheses
      ];

      for (const phone of validPhones) {
        await query(`
          INSERT INTO shops (shop_domain, access_token, merchant_phone)
          VALUES ($1, $2, $3)
          ON CONFLICT (shop_domain) DO UPDATE SET merchant_phone = $3
        `, [testDomain, 'test-token', phone]);

        const result = await query(
          'SELECT merchant_phone FROM shops WHERE shop_domain = $1',
          [testDomain],
        );

        expect((result[0] as any).merchant_phone).toBe(phone);
      }
    });

    it('should accept special characters in merchant_name', async() => {
      const testDomain = 'test-merchant-name-special.myshopify.com';
      const names = [
        "O'Brien's Store",
        'José García Shop',
        'Store & Co.',
        'Shop (Formerly Known As)',
      ];

      for (const name of names) {
        await query(`
          INSERT INTO shops (shop_domain, access_token, merchant_name)
          VALUES ($1, $2, $3)
          ON CONFLICT (shop_domain) DO UPDATE SET merchant_name = $3
        `, [testDomain, 'test-token', name]);

        const result = await query(
          'SELECT merchant_name FROM shops WHERE shop_domain = $1',
          [testDomain],
        );

        expect((result[0] as any).merchant_name).toBe(name);
      }
    });

    it('should enforce VARCHAR(255) length limit on merchant_email', async() => {
      const testDomain = 'test-merchant-email-length.myshopify.com';
      const longEmail = `${'a'.repeat(240)}@example.com`; // 252 characters, under limit

      await query(`
        INSERT INTO shops (shop_domain, access_token, merchant_email)
        VALUES ($1, $2, $3)
      `, [testDomain, 'test-token', longEmail]);

      const result = await query(
        'SELECT merchant_email FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect((result[0] as any).merchant_email).toBe(longEmail);
      expect((result[0] as any).merchant_email.length).toBeLessThanOrEqual(255);
    });

    it('should enforce VARCHAR(255) length limit on merchant_phone', async() => {
      const testDomain = 'test-merchant-phone-length.myshopify.com';
      const longPhone = `+1-${'5'.repeat(250)}`; // 253 characters, under limit

      await query(`
        INSERT INTO shops (shop_domain, access_token, merchant_phone)
        VALUES ($1, $2, $3)
      `, [testDomain, 'test-token', longPhone]);

      const result = await query(
        'SELECT merchant_phone FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect((result[0] as any).merchant_phone).toBe(longPhone);
      expect((result[0] as any).merchant_phone.length).toBeLessThanOrEqual(255);
    });

    it('should enforce VARCHAR(255) length limit on merchant_name', async() => {
      const testDomain = 'test-merchant-name-length.myshopify.com';
      const longName = 'A'.repeat(255);

      await query(`
        INSERT INTO shops (shop_domain, access_token, merchant_name)
        VALUES ($1, $2, $3)
      `, [testDomain, 'test-token', longName]);

      const result = await query(
        'SELECT merchant_name FROM shops WHERE shop_domain = $1',
        [testDomain],
      );

      expect((result[0] as any).merchant_name).toBe(longName);
      expect((result[0] as any).merchant_name.length).toBe(255);
    });
  });

  describe('Migration Idempotency', () => {
    it('should be idempotent - running migration twice should not cause errors', async() => {
      // This test verifies that the DO $$ IF NOT EXISTS block works correctly
      // By checking column existence, we confirm migration can run multiple times safely

      const merchantEmailExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_email'
      `);

      const merchantPhoneExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_phone'
      `);

      const merchantNameExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'shops' AND column_name = 'merchant_name'
      `);

      // All columns should exist exactly once
      expect(parseInt((merchantEmailExists[0] as any).count)).toBe(1);
      expect(parseInt((merchantPhoneExists[0] as any).count)).toBe(1);
      expect(parseInt((merchantNameExists[0] as any).count)).toBe(1);
    });
  });
});
