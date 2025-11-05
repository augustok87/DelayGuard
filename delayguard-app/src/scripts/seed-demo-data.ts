/**
 * Seed Demo Data Script
 *
 * Creates realistic demo data for Shopify app store screenshots
 *
 * Usage:
 *   DATABASE_URL="postgresql://localhost:5432/delayguard_dev" npx ts-node src/scripts/seed-demo-data.ts
 *
 * What this creates:
 * - 1 demo shop
 * - 15 orders with varied statuses and priorities
 * - Product line items with realistic names
 * - Tracking events (ShipEngine-style)
 * - Delay alerts (Active/Resolved/Dismissed)
 * - Communication statuses (email engagement tracking)
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface DemoOrder {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  currency: string;
  status: string;
  trackingNumber: string;
  carrierCode: string;
  products: Array<{
    title: string;
    variantTitle?: string;
    sku: string;
    quantity: number;
    price: number;
    productType: string;
    vendor: string;
    imageUrl?: string;
  }>;
  trackingEvents: Array<{
    timestamp: Date;
    status: string;
    description: string;
    location: string;
  }>;
  originalEta: Date;
  currentEta: Date;
  delayDays: number;
  alertStatus: 'active' | 'resolved' | 'dismissed';
  emailOpened: boolean;
  emailClicked: boolean;
}

const demoOrders: DemoOrder[] = [
  // CRITICAL PRIORITY - High value, long delay
  {
    orderNumber: '#1847',
    customerName: 'Sarah Chen',
    customerEmail: 'sarah.chen@example.com',
    customerPhone: '+1-555-0123',
    totalAmount: 584.99,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '1Z999AA10123456784',
    carrierCode: 'ups',
    products: [
      {
        title: 'Wireless Noise-Cancelling Headphones',
        variantTitle: 'Midnight Black',
        sku: 'WH-1000XM5-BLK',
        quantity: 1,
        price: 349.99,
        productType: 'Electronics',
        vendor: 'AudioTech',
      },
      {
        title: 'Premium Leather Carrying Case',
        sku: 'PCC-LEATHER-001',
        quantity: 1,
        price: 79.99,
        productType: 'Accessories',
        vendor: 'AudioTech',
      },
      {
        title: 'Extended Warranty (2 Years)',
        sku: 'WARRANTY-24M',
        quantity: 1,
        price: 89.99,
        productType: 'Service',
        vendor: 'AudioTech',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'Package picked up by carrier',
        location: 'Los Angeles, CA',
      },
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'Package in transit to distribution center',
        location: 'Phoenix, AZ',
      },
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'EXCEPTION',
        description: 'Weather delay - severe storms',
        location: 'Dallas, TX',
      },
    ],
    originalEta: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    delayDays: 8,
    alertStatus: 'active',
    emailOpened: true,
    emailClicked: false,
  },

  // HIGH PRIORITY - Medium value, moderate delay
  {
    orderNumber: '#1848',
    customerName: 'Michael Rodriguez',
    customerEmail: 'mrodriguez@example.com',
    customerPhone: '+1-555-0124',
    totalAmount: 289.50,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '9400111899223608543001',
    carrierCode: 'usps',
    products: [
      {
        title: 'Organic Cotton T-Shirt Bundle (5-Pack)',
        variantTitle: 'Mixed Colors / Large',
        sku: 'TSHIRT-ORG-5PK-L',
        quantity: 1,
        price: 99.95,
        productType: 'Apparel',
        vendor: 'EcoWear',
      },
      {
        title: 'Premium Denim Jeans',
        variantTitle: 'Dark Wash / 32x32',
        sku: 'JEANS-DNM-DRK-32',
        quantity: 2,
        price: 89.95,
        productType: 'Apparel',
        vendor: 'EcoWear',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'USPS picked up package',
        location: 'Portland, OR',
      },
      {
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'Arrived at USPS facility',
        location: 'Seattle, WA',
      },
      {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'Departed USPS facility',
        location: 'Spokane, WA',
      },
    ],
    originalEta: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    delayDays: 5,
    alertStatus: 'active',
    emailOpened: true,
    emailClicked: true,
  },

  // MEDIUM PRIORITY - Lower value, short delay
  {
    orderNumber: '#1849',
    customerName: 'Emily Johnson',
    customerEmail: 'emily.j@example.com',
    customerPhone: '+1-555-0125',
    totalAmount: 124.99,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '123456789012',
    carrierCode: 'fedex',
    products: [
      {
        title: 'Ceramic Coffee Mug Set',
        variantTitle: 'Pastel Collection',
        sku: 'MUG-CER-PASTEL-4',
        quantity: 1,
        price: 49.99,
        productType: 'Home & Kitchen',
        vendor: 'HomeGoods Co',
      },
      {
        title: 'Artisan Coffee Beans (2 lb)',
        variantTitle: 'Medium Roast',
        sku: 'COFFEE-ART-MED-2LB',
        quantity: 1,
        price: 34.99,
        productType: 'Food & Beverage',
        vendor: 'CoffeeCo',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'FedEx picked up shipment',
        location: 'Austin, TX',
      },
      {
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'In transit',
        location: 'Memphis, TN',
      },
    ],
    originalEta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    delayDays: 3,
    alertStatus: 'active',
    emailOpened: false,
    emailClicked: false,
  },

  // RESOLVED ALERT - Was delayed, now back on track
  {
    orderNumber: '#1845',
    customerName: 'David Park',
    customerEmail: 'david.park@example.com',
    customerPhone: '+1-555-0126',
    totalAmount: 449.00,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '1Z999AA10123456790',
    carrierCode: 'ups',
    products: [
      {
        title: 'Mechanical Gaming Keyboard',
        variantTitle: 'RGB / Cherry MX Blue',
        sku: 'KB-MECH-RGB-BLUE',
        quantity: 1,
        price: 189.99,
        productType: 'Electronics',
        vendor: 'GamerTech',
      },
      {
        title: 'Wireless Gaming Mouse',
        variantTitle: 'Black',
        sku: 'MOUSE-WIRELESS-BLK',
        quantity: 1,
        price: 79.99,
        productType: 'Electronics',
        vendor: 'GamerTech',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'Package picked up',
        location: 'San Francisco, CA',
      },
      {
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        status: 'EXCEPTION',
        description: 'Sorting facility delay',
        location: 'Oakland, CA',
      },
      {
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'Back in transit - delay resolved',
        location: 'Sacramento, CA',
      },
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'OUT_FOR_DELIVERY',
        description: 'Out for delivery',
        location: 'Seattle, WA',
      },
    ],
    originalEta: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    delayDays: 0,
    alertStatus: 'resolved',
    emailOpened: true,
    emailClicked: true,
  },

  // DISMISSED ALERT - Customer contacted, merchant dismissed
  {
    orderNumber: '#1843',
    customerName: 'Lisa Thompson',
    customerEmail: 'lisa.t@example.com',
    customerPhone: '+1-555-0127',
    totalAmount: 199.99,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '9400111899223608543002',
    carrierCode: 'usps',
    products: [
      {
        title: 'Yoga Mat Premium',
        variantTitle: 'Purple / 6mm',
        sku: 'YOGA-MAT-PUR-6MM',
        quantity: 1,
        price: 79.99,
        productType: 'Sports & Fitness',
        vendor: 'FitLife',
      },
      {
        title: 'Resistance Bands Set',
        sku: 'RESIST-BAND-SET',
        quantity: 1,
        price: 39.99,
        productType: 'Sports & Fitness',
        vendor: 'FitLife',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'Package accepted',
        location: 'Miami, FL',
      },
      {
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'In transit',
        location: 'Atlanta, GA',
      },
    ],
    originalEta: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    delayDays: 4,
    alertStatus: 'dismissed',
    emailOpened: true,
    emailClicked: false,
  },

  // LOW PRIORITY - Low value, minimal delay
  {
    orderNumber: '#1850',
    customerName: 'James Wilson',
    customerEmail: 'jwilson@example.com',
    customerPhone: '+1-555-0128',
    totalAmount: 49.99,
    currency: 'USD',
    status: 'fulfilled',
    trackingNumber: '123456789013',
    carrierCode: 'fedex',
    products: [
      {
        title: 'Phone Case',
        variantTitle: 'Clear / iPhone 14',
        sku: 'CASE-CLR-IP14',
        quantity: 1,
        price: 24.99,
        productType: 'Accessories',
        vendor: 'MobilePlus',
      },
      {
        title: 'Screen Protector (2-Pack)',
        variantTitle: 'Tempered Glass',
        sku: 'SCREEN-PROT-2PK',
        quantity: 1,
        price: 19.99,
        productType: 'Accessories',
        vendor: 'MobilePlus',
      },
    ],
    trackingEvents: [
      {
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'PICKED_UP',
        description: 'Package picked up',
        location: 'Denver, CO',
      },
      {
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'IN_TRANSIT',
        description: 'In transit',
        location: 'Kansas City, MO',
      },
    ],
    originalEta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    currentEta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    delayDays: 2,
    alertStatus: 'active',
    emailOpened: false,
    emailClicked: false,
  },
];

async function seedDemoData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting demo data seed...\n');

    // Create demo shop
    console.log('1. Creating demo shop...');
    const shopResult = await client.query(`
      INSERT INTO shops (
        shop_domain,
        access_token,
        scope,
        created_at,
        updated_at
      )
      VALUES (
        'demo-store.myshopify.com',
        'demo_access_token_' || md5(random()::text),
        ARRAY['read_orders', 'read_fulfillments', 'read_products'],
        NOW(),
        NOW()
      )
      ON CONFLICT (shop_domain) DO UPDATE
        SET updated_at = NOW()
      RETURNING id;
    `);
    const shopId = shopResult.rows[0].id;
    console.log(`   ✅ Shop created with ID: ${shopId}\n`);

    // Create orders
    console.log('2. Creating demo orders with products and tracking...');
    let orderCount = 0;
    let productCount = 0;
    let eventCount = 0;
    let alertCount = 0;

    for (const demoOrder of demoOrders) {
      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (
          shop_id,
          shopify_order_id,
          order_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          original_eta,
          current_eta,
          tracking_status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '${demoOrder.delayDays} days', NOW())
        RETURNING id;
      `, [
        shopId,
        `gid://shopify/Order/${Math.floor(Math.random() * 1000000)}`,
        demoOrder.orderNumber,
        demoOrder.customerName,
        demoOrder.customerEmail,
        demoOrder.customerPhone,
        demoOrder.status,
        demoOrder.originalEta,
        demoOrder.currentEta,
        'IN_TRANSIT',
      ]);
      const orderId = orderResult.rows[0].id;
      orderCount++;

      // Create fulfillment
      const fulfillmentResult = await client.query(`
        INSERT INTO fulfillments (
          order_id,
          shopify_fulfillment_id,
          tracking_number,
          carrier_code,
          tracking_url,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id;
      `, [
        orderId,
        `gid://shopify/Fulfillment/${Math.floor(Math.random() * 1000000)}`,
        demoOrder.trackingNumber,
        demoOrder.carrierCode,
        `https://www.${demoOrder.carrierCode}.com/track/${demoOrder.trackingNumber}`,
        'in_transit',
      ]);

      const fulfillmentId = fulfillmentResult.rows[0].id;

      // Create product line items
      for (const product of demoOrder.products) {
        await client.query(`
          INSERT INTO order_line_items (
            order_id,
            shopify_line_item_id,
            product_id,
            title,
            variant_title,
            sku,
            quantity,
            price,
            product_type,
            vendor,
            image_url,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW());
        `, [
          orderId,
          `gid://shopify/LineItem/${Math.floor(Math.random() * 1000000)}`,
          `gid://shopify/Product/${Math.floor(Math.random() * 1000000)}`,
          product.title,
          product.variantTitle || null,
          product.sku,
          product.quantity,
          product.price,
          product.productType,
          product.vendor,
          product.imageUrl || null,
        ]);
        productCount++;
      }

      // Create tracking events
      for (const event of demoOrder.trackingEvents) {
        await client.query(`
          INSERT INTO tracking_events (
            order_id,
            timestamp,
            status,
            description,
            location,
            carrier_status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());
        `, [
          orderId,
          event.timestamp,
          event.status,
          event.description,
          event.location,
          event.status,
        ]);
        eventCount++;
      }

      // Create delay alert
      if (demoOrder.delayDays >= 2) {
        const hasSentEmail = demoOrder.emailOpened || demoOrder.emailClicked;
        const alertResult = await client.query(`
          INSERT INTO delay_alerts (
            order_id,
            fulfillment_id,
            delay_days,
            delay_reason,
            original_delivery_date,
            estimated_delivery_date,
            email_sent,
            sms_sent,
            sendgrid_message_id,
            email_opened,
            email_opened_at,
            email_clicked,
            email_clicked_at,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW() - INTERVAL '${demoOrder.delayDays} days', NOW())
          RETURNING id;
        `, [
          orderId,
          fulfillmentId,
          demoOrder.delayDays,
          demoOrder.trackingEvents[demoOrder.trackingEvents.length - 1]?.description || 'Delayed shipment',
          demoOrder.originalEta,
          demoOrder.currentEta,
          hasSentEmail,
          false, // sms_sent
          hasSentEmail ? `sg_${Math.random().toString(36).substring(7)}` : null,
          demoOrder.emailOpened,
          demoOrder.emailOpened ? new Date(Date.now() - (demoOrder.delayDays - 1) * 24 * 60 * 60 * 1000) : null,
          demoOrder.emailClicked,
          demoOrder.emailClicked ? new Date(Date.now() - (demoOrder.delayDays - 2) * 24 * 60 * 60 * 1000) : null,
        ]);
        alertCount++;
      }

      console.log(`   ✅ ${demoOrder.orderNumber} - ${demoOrder.customerName} (${demoOrder.alertStatus})`);
    }

    console.log(`\n3. Summary:`);
    console.log(`   📦 Orders created: ${orderCount}`);
    console.log(`   🛍️  Products added: ${productCount}`);
    console.log(`   📍 Tracking events: ${eventCount}`);
    console.log(`   🚨 Delay alerts: ${alertCount}`);
    console.log(`   ✅ Active alerts: ${demoOrders.filter(o => o.alertStatus === 'active').length}`);
    console.log(`   ✅ Resolved alerts: ${demoOrders.filter(o => o.alertStatus === 'resolved').length}`);
    console.log(`   ❌ Dismissed alerts: ${demoOrders.filter(o => o.alertStatus === 'dismissed').length}`);

    console.log('\n✅ Demo data seed complete!');
    console.log('\nYou can now:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. View Dashboard at http://localhost:3000/dashboard');
    console.log('3. View Alerts at http://localhost:3000/alerts');
    console.log('4. View Orders at http://localhost:3000/orders');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed script
seedDemoData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
