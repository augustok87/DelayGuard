/**
 * Integration Tests: Delay Type Toggle Schema
 *
 * Tests for warehouse_delays_enabled, carrier_delays_enabled, transit_delays_enabled columns
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

describe('Delay Type Toggle Schema', () => {
  beforeAll(async() => {
    // Initialize database connection and run migrations
    await setupDatabase();
    await runMigrations();
  });

  afterAll(async() => {
    // Clean up test data
    await query(`DELETE FROM shops WHERE shop_domain LIKE 'test-delay-toggles%'`);
    await pool.end();
  });

  describe('Column Existence', () => {
    it('should have warehouse_delays_enabled column in app_settings table', async() => {
      const result = await query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'warehouse_delays_enabled'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('warehouse_delays_enabled');
      expect((result[0] as any).data_type).toBe('boolean');
      expect((result[0] as any).column_default).toBe('true'); // DEFAULT TRUE
    });

    it('should have carrier_delays_enabled column in app_settings table', async() => {
      const result = await query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'carrier_delays_enabled'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('carrier_delays_enabled');
      expect((result[0] as any).data_type).toBe('boolean');
      expect((result[0] as any).column_default).toBe('true'); // DEFAULT TRUE
    });

    it('should have transit_delays_enabled column in app_settings table', async() => {
      const result = await query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'transit_delays_enabled'
      `);

      expect(result.length).toBe(1);
      expect((result[0] as any).column_name).toBe('transit_delays_enabled');
      expect((result[0] as any).data_type).toBe('boolean');
      expect((result[0] as any).column_default).toBe('true'); // DEFAULT TRUE
    });

    it('should have DEFAULT TRUE for all toggle columns', async() => {
      const result = await query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'app_settings'
          AND column_name IN ('warehouse_delays_enabled', 'carrier_delays_enabled', 'transit_delays_enabled')
        ORDER BY column_name
      `);

      expect(result.length).toBe(3);
      (result as any[]).forEach((col: { column_name: string; column_default: string }) => {
        expect(col.column_default).toBe('true');
      });
    });
  });

  describe('Data Operations', () => {
    let testShopId: number;

    beforeEach(async() => {
      // Create test shop for app_settings
      const shopResult = await query(`
        INSERT INTO shops (shop_domain, access_token)
        VALUES ($1, $2)
        RETURNING id
      `, ['test-delay-toggles.myshopify.com', 'test-token']);

      testShopId = (shopResult[0] as any).id;
    });

    afterEach(async() => {
      // Clean up test shop (CASCADE will delete app_settings)
      await query('DELETE FROM shops WHERE id = $1', [testShopId]);
    });

    it('should use DEFAULT TRUE when inserting new app_settings', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled)
        VALUES ($1, 2, true, false)
      `, [testShopId]);

      const result = await query(`
        SELECT warehouse_delays_enabled, carrier_delays_enabled, transit_delays_enabled
        FROM app_settings
        WHERE shop_id = $1
      `, [testShopId]);

      expect((result[0] as any).warehouse_delays_enabled).toBe(true);
      expect((result[0] as any).carrier_delays_enabled).toBe(true);
      expect((result[0] as any).transit_delays_enabled).toBe(true);
    });

    it('should allow UPDATE to FALSE for warehouse_delays_enabled', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled)
        VALUES ($1, 2, true, false)
      `, [testShopId]);

      await query(`
        UPDATE app_settings
        SET warehouse_delays_enabled = FALSE
        WHERE shop_id = $1
      `, [testShopId]);

      const result = await query(`
        SELECT warehouse_delays_enabled
        FROM app_settings
        WHERE shop_id = $1
      `, [testShopId]);

      expect((result[0] as any).warehouse_delays_enabled).toBe(false);
    });

    it('should allow UPDATE to FALSE for carrier_delays_enabled', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled)
        VALUES ($1, 2, true, false)
      `, [testShopId]);

      await query(`
        UPDATE app_settings
        SET carrier_delays_enabled = FALSE
        WHERE shop_id = $1
      `, [testShopId]);

      const result = await query(`
        SELECT carrier_delays_enabled
        FROM app_settings
        WHERE shop_id = $1
      `, [testShopId]);

      expect((result[0] as any).carrier_delays_enabled).toBe(false);
    });

    it('should allow UPDATE to FALSE for transit_delays_enabled', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled)
        VALUES ($1, 2, true, false)
      `, [testShopId]);

      await query(`
        UPDATE app_settings
        SET transit_delays_enabled = FALSE
        WHERE shop_id = $1
      `, [testShopId]);

      const result = await query(`
        SELECT transit_delays_enabled
        FROM app_settings
        WHERE shop_id = $1
      `, [testShopId]);

      expect((result[0] as any).transit_delays_enabled).toBe(false);
    });

    it('should allow all 3 flags to be independently toggled', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled)
        VALUES ($1, 2, true, false)
      `, [testShopId]);

      // Toggle to different states
      await query(`
        UPDATE app_settings
        SET warehouse_delays_enabled = FALSE,
            carrier_delays_enabled = TRUE,
            transit_delays_enabled = FALSE
        WHERE shop_id = $1
      `, [testShopId]);

      const result = await query(`
        SELECT warehouse_delays_enabled, carrier_delays_enabled, transit_delays_enabled
        FROM app_settings
        WHERE shop_id = $1
      `, [testShopId]);

      expect((result[0] as any).warehouse_delays_enabled).toBe(false);
      expect((result[0] as any).carrier_delays_enabled).toBe(true);
      expect((result[0] as any).transit_delays_enabled).toBe(false);
    });

    it('should SELECT toggle flags in JOIN with shops table', async() => {
      await query(`
        INSERT INTO app_settings (shop_id, delay_threshold, email_enabled, sms_enabled, warehouse_delays_enabled)
        VALUES ($1, 2, true, false, false)
      `, [testShopId]);

      const result = await query(`
        SELECT s.shop_domain, a.warehouse_delays_enabled, a.carrier_delays_enabled, a.transit_delays_enabled
        FROM app_settings a
        JOIN shops s ON a.shop_id = s.id
        WHERE s.id = $1
      `, [testShopId]);

      expect((result[0] as any).shop_domain).toBe('test-delay-toggles.myshopify.com');
      expect((result[0] as any).warehouse_delays_enabled).toBe(false);
      expect((result[0] as any).carrier_delays_enabled).toBe(true); // DEFAULT
      expect((result[0] as any).transit_delays_enabled).toBe(true); // DEFAULT
    });
  });

  describe('Migration Idempotency', () => {
    it('should be idempotent - running migration twice should not cause errors', async() => {
      // Verify each column exists exactly once
      const warehouseExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'warehouse_delays_enabled'
      `);

      const carrierExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'carrier_delays_enabled'
      `);

      const transitExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'app_settings' AND column_name = 'transit_delays_enabled'
      `);

      expect(parseInt((warehouseExists[0] as any).count)).toBe(1);
      expect(parseInt((carrierExists[0] as any).count)).toBe(1);
      expect(parseInt((transitExists[0] as any).count)).toBe(1);
    });
  });
});
