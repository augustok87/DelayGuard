import { Pool, PoolClient } from 'pg';
// import { AppConfig } from '../types'; // Removed unused import

let pool: Pool;

export async function setupDatabase(): Promise<void> {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();

    // Run migrations
    await runMigrations();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function getDatabaseClient(): Promise<PoolClient> {
  if (!pool) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }
  return pool.connect();
}

export async function query(text: string, params?: any[]): Promise<any> {
  const client = await getDatabaseClient();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function runMigrations(): Promise<void> {
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

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
      CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
      CREATE INDEX IF NOT EXISTS idx_fulfillments_order_id ON fulfillments(order_id);
      CREATE INDEX IF NOT EXISTS idx_delay_alerts_order_id ON delay_alerts(order_id);
      CREATE INDEX IF NOT EXISTS idx_delay_alerts_created_at ON delay_alerts(created_at);
    `);

    console.log('✅ Database migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
