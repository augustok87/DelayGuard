import { Pool, PoolClient } from 'pg';
import { setupDatabase, runMigrations, query } from '../../../database/connection';

describe('Tracking Events Database Schema', () => {
  let testPool: Pool;
  let client: PoolClient;

  beforeAll(async() => {
    // Setup test database connection
    const testDatabaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/delayguard_test';

    testPool = new Pool({
      connectionString: testDatabaseUrl,
      max: 1,
    });

    client = await testPool.connect();

    // Run migrations
    await setupDatabase();
    await runMigrations();
  });

  afterAll(async() => {
    if (client) {
      client.release();
    }
    if (testPool) {
      await testPool.end();
    }
  });

  describe('tracking_events Table Structure', () => {
    it('should have tracking_events table created', async() => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'tracking_events'
        );
      `);

      expect(result.rows[0].exists).toBe(true);
    });

    it('should have correct columns with proper data types', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'tracking_events'
        ORDER BY ordinal_position;
      `);

      const columns = result.rows;

      // Verify all required columns exist with correct types
      const expectedColumns = [
        { column_name: 'id', data_type: 'integer', is_nullable: 'NO' },
        { column_name: 'order_id', data_type: 'integer', is_nullable: 'NO' },
        { column_name: 'timestamp', data_type: 'timestamp without time zone', is_nullable: 'NO' },
        { column_name: 'status', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'description', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'location', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'carrier_status', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'created_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
        { column_name: 'updated_at', data_type: 'timestamp without time zone', is_nullable: 'YES' },
      ];

      expectedColumns.forEach(expected => {
        const column = columns.find(c => c.column_name === expected.column_name);
        expect(column).toBeDefined();
        expect(column?.data_type).toBe(expected.data_type);
        expect(column?.is_nullable).toBe(expected.is_nullable);
      });
    });

    it('should have id column as primary key with auto-increment', async() => {
      const result = await client.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'tracking_events' AND column_name = 'id';
      `);

      expect(result.rows[0].column_default).toContain('nextval');

      // Verify primary key constraint
      const pkResult = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'tracking_events' AND constraint_type = 'PRIMARY KEY';
      `);

      expect(pkResult.rows.length).toBe(1);
    });

    it('should have foreign key constraint on order_id referencing orders table', async() => {
      const result = await client.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'tracking_events'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'order_id';
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].foreign_table_name).toBe('orders');
      expect(result.rows[0].foreign_column_name).toBe('id');
      expect(result.rows[0].delete_rule).toBe('CASCADE'); // Deleting order should delete tracking events
    });

    it('should have unique constraint on (order_id, timestamp)', async() => {
      const result = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'tracking_events'
          AND constraint_type = 'UNIQUE';
      `);

      // Should have at least one unique constraint
      expect(result.rows.length).toBeGreaterThan(0);

      // Verify it's on the correct columns
      const uniqueColumnsResult = await client.query(`
        SELECT kcu.column_name
        FROM information_schema.key_column_usage AS kcu
        JOIN information_schema.table_constraints AS tc
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'tracking_events'
          AND tc.constraint_type = 'UNIQUE'
        ORDER BY kcu.ordinal_position;
      `);

      const columnNames = uniqueColumnsResult.rows.map(row => row.column_name);
      expect(columnNames).toContain('order_id');
      expect(columnNames).toContain('timestamp');
    });

    it('should have index on order_id for performance', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tracking_events' AND indexname LIKE '%order_id%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have index on timestamp for performance', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tracking_events' AND indexname LIKE '%timestamp%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have default timestamps for created_at and updated_at', async() => {
      const result = await client.query(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = 'tracking_events'
          AND column_name IN ('created_at', 'updated_at');
      `);

      const columns = result.rows;
      const createdAt = columns.find(c => c.column_name === 'created_at');
      const updatedAt = columns.find(c => c.column_name === 'updated_at');

      expect(createdAt?.column_default).toContain('CURRENT_TIMESTAMP');
      expect(updatedAt?.column_default).toContain('CURRENT_TIMESTAMP');
    });
  });

  describe('orders Table ETA Columns', () => {
    it('should have original_eta column added to orders table', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'original_eta';
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('timestamp without time zone');
      expect(result.rows[0].is_nullable).toBe('YES'); // Nullable because not all orders have ETAs
    });

    it('should have current_eta column added to orders table', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'current_eta';
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('timestamp without time zone');
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have tracking_status column added to orders table', async() => {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'tracking_status';
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].data_type).toBe('character varying');
      expect(result.rows[0].character_maximum_length).toBe(50);
      expect(result.rows[0].is_nullable).toBe('YES');
    });

    it('should have index on tracking_status for filtering', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'orders' AND indexname LIKE '%tracking_status%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD Operations on tracking_events', () => {
    let testOrderId: number;

    beforeEach(async() => {
      // Create test shop
      const shopResult = await client.query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ('test-shop.myshopify.com', 'test-token', ARRAY['read_orders'])
        RETURNING id;
      `);

      // Create test order
      const orderResult = await client.query(`
        INSERT INTO orders (
          shop_id, shopify_order_id, order_number,
          customer_name, customer_email, status
        )
        VALUES ($1, 'gid://shopify/Order/123', '#1234', 'John Doe', 'john@example.com', 'processing')
        RETURNING id;
      `, [shopResult.rows[0].id]);

      testOrderId = orderResult.rows[0].id;
    });

    afterEach(async() => {
      // Clean up test data
      await client.query('DELETE FROM tracking_events WHERE order_id = $1', [testOrderId]);
      await client.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
      await client.query('DELETE FROM shops');
    });

    it('should insert tracking event successfully', async() => {
      const result = await client.query(`
        INSERT INTO tracking_events (
          order_id, timestamp, status, description, location, carrier_status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        testOrderId,
        new Date('2025-11-05T10:30:00Z'),
        'IN_TRANSIT',
        'Package picked up',
        'Memphis, TN',
        'IT',
      ]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].order_id).toBe(testOrderId);
      expect(result.rows[0].status).toBe('IN_TRANSIT');
      expect(result.rows[0].description).toBe('Package picked up');
      expect(result.rows[0].location).toBe('Memphis, TN');
      expect(result.rows[0].carrier_status).toBe('IT');
    });

    it('should prevent duplicate tracking events (same order_id and timestamp)', async() => {
      const eventData = {
        order_id: testOrderId,
        timestamp: new Date('2025-11-05T10:30:00Z'),
        status: 'IN_TRANSIT',
        description: 'Package picked up',
      };

      // Insert first event
      await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES ($1, $2, $3, $4);
      `, [eventData.order_id, eventData.timestamp, eventData.status, eventData.description]);

      // Try to insert duplicate - should fail
      await expect(
        client.query(`
          INSERT INTO tracking_events (order_id, timestamp, status, description)
          VALUES ($1, $2, $3, $4);
        `, [eventData.order_id, eventData.timestamp, eventData.status, eventData.description]),
      ).rejects.toThrow();
    });

    it('should support ON CONFLICT UPSERT for idempotent inserts', async() => {
      const eventData = {
        order_id: testOrderId,
        timestamp: new Date('2025-11-05T10:30:00Z'),
        status: 'IN_TRANSIT',
        description: 'Package picked up',
      };

      // First insert
      await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (order_id, timestamp) DO UPDATE
        SET status = EXCLUDED.status, description = EXCLUDED.description;
      `, [eventData.order_id, eventData.timestamp, eventData.status, eventData.description]);

      // Second insert with updated description (should update, not error)
      const result = await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (order_id, timestamp) DO UPDATE
        SET status = EXCLUDED.status, description = EXCLUDED.description
        RETURNING *;
      `, [eventData.order_id, eventData.timestamp, 'IN_TRANSIT', 'Updated description']);

      expect(result.rows[0].description).toBe('Updated description');

      // Verify only one row exists
      const countResult = await client.query(
        'SELECT COUNT(*) FROM tracking_events WHERE order_id = $1',
        [testOrderId],
      );
      expect(parseInt(countResult.rows[0].count)).toBe(1);
    });

    it('should retrieve tracking events ordered by timestamp descending', async() => {
      // Insert multiple events
      await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES
          ($1, '2025-11-05 10:00:00', 'ACCEPTED', 'Package accepted'),
          ($1, '2025-11-05 12:00:00', 'IN_TRANSIT', 'Package in transit'),
          ($1, '2025-11-05 14:00:00', 'OUT_FOR_DELIVERY', 'Out for delivery');
      `, [testOrderId]);

      const result = await client.query(`
        SELECT * FROM tracking_events
        WHERE order_id = $1
        ORDER BY timestamp DESC;
      `, [testOrderId]);

      expect(result.rows.length).toBe(3);
      expect(result.rows[0].status).toBe('OUT_FOR_DELIVERY'); // Most recent first
      expect(result.rows[1].status).toBe('IN_TRANSIT');
      expect(result.rows[2].status).toBe('ACCEPTED');
    });

    it('should delete tracking events when parent order is deleted (CASCADE)', async() => {
      // Insert tracking event
      await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES ($1, NOW(), 'IN_TRANSIT', 'Test event');
      `, [testOrderId]);

      // Verify event exists
      let result = await client.query(
        'SELECT COUNT(*) FROM tracking_events WHERE order_id = $1',
        [testOrderId],
      );
      expect(parseInt(result.rows[0].count)).toBe(1);

      // Delete parent order
      await client.query('DELETE FROM orders WHERE id = $1', [testOrderId]);

      // Verify tracking events were cascade deleted
      result = await client.query(
        'SELECT COUNT(*) FROM tracking_events WHERE order_id = $1',
        [testOrderId],
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });

    it('should handle null location and carrier_status gracefully', async() => {
      const result = await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description)
        VALUES ($1, NOW(), 'IN_TRANSIT', 'Event without location')
        RETURNING *;
      `, [testOrderId]);

      expect(result.rows[0].location).toBeNull();
      expect(result.rows[0].carrier_status).toBeNull();
    });

    it('should update existing tracking event', async() => {
      // Insert event
      const insertResult = await client.query(`
        INSERT INTO tracking_events (order_id, timestamp, status, description, location)
        VALUES ($1, NOW(), 'IN_TRANSIT', 'Original description', 'Memphis, TN')
        RETURNING id;
      `, [testOrderId]);

      const eventId = insertResult.rows[0].id;

      // Update event
      await client.query(`
        UPDATE tracking_events
        SET description = $1, location = $2
        WHERE id = $3;
      `, ['Updated description', 'Louisville, KY', eventId]);

      // Verify update
      const result = await client.query(
        'SELECT * FROM tracking_events WHERE id = $1',
        [eventId],
      );

      expect(result.rows[0].description).toBe('Updated description');
      expect(result.rows[0].location).toBe('Louisville, KY');
    });
  });

  describe('ETA Fields on orders Table', () => {
    let testOrderId: number;
    let testShopId: number;

    beforeEach(async() => {
      // Create test shop
      const shopResult = await client.query(`
        INSERT INTO shops (shop_domain, access_token, scope)
        VALUES ('test-shop-eta.myshopify.com', 'test-token', ARRAY['read_orders'])
        RETURNING id;
      `);
      testShopId = shopResult.rows[0].id;

      // Create test order
      const orderResult = await client.query(`
        INSERT INTO orders (
          shop_id, shopify_order_id, order_number,
          customer_name, customer_email, status
        )
        VALUES ($1, 'gid://shopify/Order/456', '#5678', 'Jane Doe', 'jane@example.com', 'processing')
        RETURNING id;
      `, [testShopId]);

      testOrderId = orderResult.rows[0].id;
    });

    afterEach(async() => {
      await client.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
      await client.query('DELETE FROM shops WHERE id = $1', [testShopId]);
    });

    it('should set original_eta and current_eta on order', async() => {
      const originalEta = new Date('2025-11-08T00:00:00Z');
      const currentEta = new Date('2025-11-10T00:00:00Z');

      await client.query(`
        UPDATE orders
        SET original_eta = $1, current_eta = $2, tracking_status = $3
        WHERE id = $4;
      `, [originalEta, currentEta, 'IN_TRANSIT', testOrderId]);

      const result = await client.query(
        'SELECT original_eta, current_eta, tracking_status FROM orders WHERE id = $1',
        [testOrderId],
      );

      expect(new Date(result.rows[0].original_eta).toISOString()).toBe(originalEta.toISOString());
      expect(new Date(result.rows[0].current_eta).toISOString()).toBe(currentEta.toISOString());
      expect(result.rows[0].tracking_status).toBe('IN_TRANSIT');
    });

    it('should allow null ETAs for orders without tracking', async() => {
      const result = await client.query(
        'SELECT original_eta, current_eta FROM orders WHERE id = $1',
        [testOrderId],
      );

      expect(result.rows[0].original_eta).toBeNull();
      expect(result.rows[0].current_eta).toBeNull();
    });

    it('should query orders by tracking_status efficiently', async() => {
      // Update order with tracking status
      await client.query(`
        UPDATE orders
        SET tracking_status = $1
        WHERE id = $2;
      `, ['DELIVERED', testOrderId]);

      // Query by status (should use index)
      const result = await client.query(`
        SELECT * FROM orders
        WHERE tracking_status = 'DELIVERED';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.some(row => row.id === testOrderId)).toBe(true);
    });

    it('should calculate delay from original_eta vs current_eta', async() => {
      const originalEta = new Date('2025-11-08T00:00:00Z');
      const currentEta = new Date('2025-11-12T00:00:00Z'); // 4 days late

      await client.query(`
        UPDATE orders
        SET original_eta = $1, current_eta = $2
        WHERE id = $3;
      `, [originalEta, currentEta, testOrderId]);

      // Query to calculate delay days
      const result = await client.query(`
        SELECT
          EXTRACT(EPOCH FROM (current_eta - original_eta)) / 86400 AS delay_days
        FROM orders
        WHERE id = $1;
      `, [testOrderId]);

      expect(Math.floor(result.rows[0].delay_days)).toBe(4);
    });
  });

  describe('Performance and Indexes', () => {
    it('should have all required indexes for tracking_events table', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'tracking_events';
      `);

      const indexNames = result.rows.map(row => row.indexname);

      // Should have indexes on order_id and timestamp for fast lookups
      const hasOrderIdIndex = indexNames.some(name => name.includes('order_id'));
      const hasTimestampIndex = indexNames.some(name => name.includes('timestamp'));

      expect(hasOrderIdIndex).toBe(true);
      expect(hasTimestampIndex).toBe(true);
    });

    it('should have all required indexes for orders table ETA columns', async() => {
      const result = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'orders' AND indexname LIKE '%tracking_status%';
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});
