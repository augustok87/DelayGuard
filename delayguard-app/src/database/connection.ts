import { Pool, PoolClient } from "pg";
// import { AppConfig } from '../types'; // Removed unused import
import { logInfo, logError } from "../utils/logger";

let pool: Pool;

export async function setupDatabase(): Promise<void> {
  try {
    // Serverless-optimized connection pool settings
    // In serverless environments (like Vercel), each function instance should use minimal connections
    // to avoid exhausting the database connection limit across many concurrent instances
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 1, // ✅ Changed from 20 to 1 for serverless (prevents connection exhaustion)
      idleTimeoutMillis: 10000, // ✅ Reduced from 30000 to 10000 (faster cleanup)
      connectionTimeoutMillis: 5000, // ✅ Increased from 2000 to 5000 (cold start tolerance)
    });

    // Test connection
    const client = await pool.connect();
    logInfo("Database connected successfully", { component: "database" });
    client.release();

    // ⚠️ IMPORTANT: Migrations removed from automatic startup
    // In serverless deployments (Vercel), migrations should be run separately using:
    //   npm run migrate:vercel
    // Running migrations here causes race conditions when multiple instances cold-start simultaneously
  } catch (error) {
    logError(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
      { component: "database", action: "connection" },
    );
    throw error;
  }
}

export async function getDatabaseClient(): Promise<PoolClient> {
  if (!pool) {
    throw new Error("Database not initialized. Call setupDatabase() first.");
  }
  return pool.connect();
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getDatabaseClient();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Export runMigrations so it can be called separately (e.g., via npm script or manual deployment step)
export async function runMigrations(): Promise<void> {
  const client = await getDatabaseClient();

  try {
    // Create shops table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        shop_domain VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        scope TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        shopify_order_id VARCHAR(255) NOT NULL,
        order_number VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_id, shopify_order_id)
      )
    `);

    // Create fulfillments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fulfillments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        shopify_fulfillment_id VARCHAR(255) NOT NULL,
        tracking_number VARCHAR(255),
        carrier_code VARCHAR(100),
        tracking_url TEXT,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, shopify_fulfillment_id)
      )
    `);

    // Create delay_alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS delay_alerts (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        fulfillment_id INTEGER REFERENCES fulfillments(id) ON DELETE CASCADE,
        delay_days INTEGER NOT NULL,
        delay_reason VARCHAR(100) NOT NULL,
        original_delivery_date TIMESTAMP,
        estimated_delivery_date TIMESTAMP,
        email_sent BOOLEAN DEFAULT FALSE,
        sms_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Phase 1.3: Add communication tracking fields to delay_alerts
    // Check if columns exist before adding them (idempotent migration)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='delay_alerts' AND column_name='sendgrid_message_id'
        ) THEN
          ALTER TABLE delay_alerts ADD COLUMN sendgrid_message_id VARCHAR(255);
          ALTER TABLE delay_alerts ADD COLUMN email_opened BOOLEAN DEFAULT FALSE;
          ALTER TABLE delay_alerts ADD COLUMN email_opened_at TIMESTAMP;
          ALTER TABLE delay_alerts ADD COLUMN email_clicked BOOLEAN DEFAULT FALSE;
          ALTER TABLE delay_alerts ADD COLUMN email_clicked_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // Phase 1.3: Create index for fast SendGrid message ID lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_delay_alerts_sendgrid_msg_id
      ON delay_alerts(sendgrid_message_id);
    `);

    // Create app_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
        delay_threshold_days INTEGER DEFAULT 2,
        email_enabled BOOLEAN DEFAULT TRUE,
        sms_enabled BOOLEAN DEFAULT FALSE,
        notification_template VARCHAR(50) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_id)
      )
    `);

    // Phase 1.2: Create order_line_items table for product information
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_line_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        shopify_line_item_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        variant_title VARCHAR(500),
        sku VARCHAR(255),
        quantity INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        product_type VARCHAR(255),
        vendor VARCHAR(255),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, shopify_line_item_id)
      )
    `);

    // Phase ShipEngine Integration: Add ETA columns to orders table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='orders' AND column_name='original_eta'
        ) THEN
          ALTER TABLE orders ADD COLUMN original_eta TIMESTAMP;
          ALTER TABLE orders ADD COLUMN current_eta TIMESTAMP;
          ALTER TABLE orders ADD COLUMN tracking_status VARCHAR(50);
        END IF;
      END $$;
    `);

    // Phase ShipEngine Integration: Create tracking_events table for carrier tracking data
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_events (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255),
        carrier_status VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, timestamp)
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
      CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
      CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
      CREATE INDEX IF NOT EXISTS idx_delay_alerts_order_id ON delay_alerts(order_id);
      CREATE INDEX IF NOT EXISTS idx_delay_alerts_created_at ON delay_alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id ON order_line_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_line_items_shopify_id ON order_line_items(shopify_line_item_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON tracking_events(order_id);
      CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_orders_tracking_status ON orders(tracking_status);
    `);

    logInfo("Database migrations completed", { component: "database" });
  } catch (error) {
    logError(
      error instanceof Error ? error.message : String(error),
      error instanceof Error ? error : undefined,
      { component: "database", action: "migration" },
    );
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
