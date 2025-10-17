import Router from 'koa-router';
import { query } from '../database/connection';
import { addDelayCheckJob } from '../queue/setup';
// import { OrderUpdateWebhook } from '../types'; // Available for future use
import crypto from 'crypto';

const router = new Router();

// HMAC verification for webhooks
function verifyWebhook(data: string, hmac: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(data, 'utf8')
    .digest('base64');
  
  return hash === hmac;
}

// Webhook handler for orders/updated
router.post('/orders/updated', async(ctx) => {
  const hmac = ctx.get('X-Shopify-Hmac-Sha256');
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get('X-Shopify-Shop-Domain');
  
  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  console.log(`📦 Order updated webhook received for shop: ${shop}`);
  
  try {
    await processOrderUpdate(shop, ctx.request.body);
    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    console.error('❌ Error processing order update webhook:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

// Webhook handler for fulfillments/updated
router.post('/fulfillments/updated', async(ctx) => {
  const hmac = ctx.get('X-Shopify-Hmac-Sha256');
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get('X-Shopify-Shop-Domain');
  
  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  console.log(`🚚 Fulfillment updated webhook received for shop: ${shop}`);
  
  try {
    await processFulfillmentUpdate(shop, ctx.request.body);
    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    console.error('❌ Error processing fulfillment update webhook:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

// Webhook handler for orders/paid
router.post('/orders/paid', async(ctx) => {
  const hmac = ctx.get('X-Shopify-Hmac-Sha256');
  const body = ctx.request.rawBody || JSON.stringify(ctx.request.body);
  const shop = ctx.get('X-Shopify-Shop-Domain');
  
  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  console.log(`💳 Order paid webhook received for shop: ${shop}`);
  
  try {
    await processOrderPaid(shop, ctx.request.body);
    ctx.status = 200;
    ctx.body = { success: true };
  } catch (error) {
    console.error('❌ Error processing order paid webhook:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

async function processOrderUpdate(shopDomain: string, orderData: any): Promise<void> {
  try {
    // Get shop ID
    const shopResult = await query(
      'SELECT id FROM shops WHERE shop_domain = $1',
      [shopDomain],
    );

    if (shopResult.length === 0) {
      console.log(`Shop ${shopDomain} not found, skipping order update`);
      return;
    }

    const shopId = shopResult[0].id;

    // Upsert order
    await query(`
      INSERT INTO orders (
        shop_id, 
        shopify_order_id, 
        order_number, 
        customer_name, 
        customer_email, 
        customer_phone, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (shop_id, shopify_order_id) 
      DO UPDATE SET
        order_number = EXCLUDED.order_number,
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        customer_phone = EXCLUDED.customer_phone,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, [
      shopId,
      orderData.id.toString(),
      orderData.name,
      orderData.customer?.first_name && orderData.customer?.last_name 
        ? `${orderData.customer.first_name} ${orderData.customer.last_name}`
        : orderData.customer?.first_name || 'Unknown',
      orderData.customer?.email,
      orderData.customer?.phone,
      orderData.fulfillment_status || 'unfulfilled',
    ]);

    // Get the order ID
    const orderResult = await query(
      'SELECT id FROM orders WHERE shop_id = $1 AND shopify_order_id = $2',
      [shopId, orderData.id.toString()],
    );

    const orderId = orderResult[0].id;

    // Process fulfillments if they exist
    if (orderData.fulfillments && orderData.fulfillments.length > 0) {
      for (const fulfillment of orderData.fulfillments) {
        await processFulfillment(orderId, fulfillment);
      }
    }

    console.log(`✅ Order ${orderData.name} processed successfully`);

  } catch (error) {
    console.error('Error processing order update:', error);
    throw error;
  }
}

async function processFulfillmentUpdate(shopDomain: string, fulfillmentData: any): Promise<void> {
  try {
    // Get shop ID
    const shopResult = await query(
      'SELECT id FROM shops WHERE shop_domain = $1',
      [shopDomain],
    );

    if (shopResult.length === 0) {
      console.log(`Shop ${shopDomain} not found, skipping fulfillment update`);
      return;
    }

    const shopId = shopResult[0].id;

    // Get order ID
    const orderResult = await query(
      'SELECT id FROM orders WHERE shop_id = $1 AND shopify_order_id = $2',
      [shopId, fulfillmentData.order_id.toString()],
    );

    if (orderResult.length === 0) {
      console.log(`Order ${fulfillmentData.order_id} not found for fulfillment update`);
      return;
    }

    const orderId = orderResult[0].id;

    // Process the fulfillment
    await processFulfillment(orderId, fulfillmentData);

    console.log(`✅ Fulfillment ${fulfillmentData.id} processed successfully`);

  } catch (error) {
    console.error('Error processing fulfillment update:', error);
    throw error;
  }
}

async function processOrderPaid(shopDomain: string, orderData: any): Promise<void> {
  try {
    // Get shop ID
    const shopResult = await query(
      'SELECT id FROM shops WHERE shop_domain = $1',
      [shopDomain],
    );

    if (shopResult.length === 0) {
      console.log(`Shop ${shopDomain} not found, skipping order paid`);
      return;
    }

    const shopId = shopResult[0].id;

    // Update order status to paid
    await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE shop_id = $2 AND shopify_order_id = $3',
      ['paid', shopId, orderData.id.toString()],
    );

    console.log(`✅ Order ${orderData.name} marked as paid`);

  } catch (error) {
    console.error('Error processing order paid:', error);
    throw error;
  }
}

async function processFulfillment(orderId: number, fulfillmentData: any): Promise<void> {
  try {
    // Upsert fulfillment
    await query(`
      INSERT INTO fulfillments (
        order_id,
        shopify_fulfillment_id,
        tracking_number,
        carrier_code,
        tracking_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (order_id, shopify_fulfillment_id)
      DO UPDATE SET
        tracking_number = EXCLUDED.tracking_number,
        carrier_code = EXCLUDED.carrier_code,
        tracking_url = EXCLUDED.tracking_url,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, [
      orderId,
      fulfillmentData.id.toString(),
      fulfillmentData.tracking_info?.number,
      fulfillmentData.tracking_info?.company,
      fulfillmentData.tracking_info?.url,
      fulfillmentData.status || 'pending',
    ]);

    // If tracking info exists, add delay check job
    if (fulfillmentData.tracking_info?.number && fulfillmentData.tracking_info?.company) {
      const shopResult = await query(
        'SELECT shop_domain FROM shops s JOIN orders o ON s.id = o.shop_id WHERE o.id = $1',
        [orderId],
      );

      if (shopResult.length > 0) {
        await addDelayCheckJob({
          orderId,
          trackingNumber: fulfillmentData.tracking_info.number,
          carrierCode: fulfillmentData.tracking_info.company,
          shopDomain: shopResult[0].shop_domain,
        });

        console.log(`🔍 Delay check job added for tracking ${fulfillmentData.tracking_info.number}`);
      }
    }

  } catch (error) {
    console.error('Error processing fulfillment:', error);
    throw error;
  }
}

export { router as webhookRoutes };
