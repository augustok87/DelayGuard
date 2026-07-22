/**
 * CustomerSyncService — Phase 2.1.a.
 *
 * Owns the ingestion side of customer intelligence. Called by the
 * BullMQ customer-sync processor for every fulfilled-order webhook.
 *
 * Pipeline:
 *   1. Resolve shop (id + access_token)
 *   2. Read orders.shopify_customer_id (NULL for guest checkouts)
 *   3. Fetch the customer from Shopify (fetchCustomerById)
 *   4. Compute the segment via deriveSegment
 *   5. UPSERT customer_intelligence
 *
 * Silent-skip semantics — see in-source comments. Aligns with the
 * Wave 2.2 webhook-side services: missing shop / order / customer
 * and guest checkouts return without throwing, because retrying on
 * those signals would thrash. DB and Shopify failures DO propagate
 * so the BullMQ processor's attempts:3 retry chain runs.
 *
 * v1.19 field-population rule (.claude/rules/backend.md): the
 * sibling test asserts every persisted column appears in the
 * UPSERT parameter array.
 */
import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { fetchCustomerById } from "./shopify-service";
import { deriveSegment, type CustomerSegment } from "./customer-segment";

// Fallback "days since last order" for first-time customers (no
// lastOrderAt). Picked well above the 90-day At-Risk cutoff so a brand
// new customer never gets misclassified as At-Risk; deriveSegment guards
// At-Risk with numberOfOrders >= 2 anyway, but this keeps the math
// defensible if those rules ever shift.
const DAYS_SINCE_LAST_ORDER_FALLBACK = 9999;

interface ShopRow {
  id: string;
  access_token: string;
}

interface OrderCustomerLookupRow {
  shopify_customer_id: string | null;
}

export class CustomerSyncService {
  private async resolveShopWithToken(
    shopDomain: string,
  ): Promise<ShopRow | null> {
    const rows = await query<ShopRow>(
      "SELECT id, access_token FROM shops WHERE shop_domain = $1",
      [shopDomain],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  private async lookupOrderCustomerId(
    shopId: string,
    shopifyOrderId: string,
  ): Promise<OrderCustomerLookupRow | null> {
    const rows = await query<OrderCustomerLookupRow>(
      "SELECT shopify_customer_id FROM orders WHERE shop_id = $1 AND shopify_order_id = $2",
      [shopId, shopifyOrderId],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  async syncCustomerForOrder(
    shopDomain: string,
    shopifyOrderId: string,
  ): Promise<void> {
    try {
      const shop = await this.resolveShopWithToken(shopDomain);
      if (!shop) {
        // Silent-skip: shop uninstalled between webhook + job dequeue.
        logger.info("Shop not found, skipping customer sync", {
          shopDomain,
          shopifyOrderId,
        });
        return;
      }

      const orderRow = await this.lookupOrderCustomerId(
        shop.id,
        shopifyOrderId,
      );
      if (!orderRow) {
        logger.info("Order not found, skipping customer sync", {
          shopDomain,
          shopifyOrderId,
        });
        return;
      }

      if (!orderRow.shopify_customer_id) {
        logger.info("Order is a guest checkout, skipping customer sync", {
          shopDomain,
          shopifyOrderId,
        });
        return;
      }

      const customer = await fetchCustomerById(
        shopDomain,
        shop.access_token,
        orderRow.shopify_customer_id,
      );
      if (!customer) {
        // Shopify says the customer no longer exists. Don't retry.
        logger.info("Customer not in Shopify, skipping customer sync", {
          shopDomain,
          shopifyOrderId,
          shopifyCustomerId: orderRow.shopify_customer_id,
        });
        return;
      }

      const daysSinceLastOrder = customer.lastOrderAt
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - customer.lastOrderAt.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : DAYS_SINCE_LAST_ORDER_FALLBACK;

      const segment: CustomerSegment = deriveSegment({
        numberOfOrders: customer.numberOfOrders,
        amountSpent: customer.amountSpent,
        daysSinceLastOrder,
        emailMarketingSubscribed: customer.emailMarketingSubscribed,
      });

      await query(
        `INSERT INTO customer_intelligence (
           shop_id,
           shopify_customer_id,
           orders_count,
           total_spent,
           customer_since,
           last_order_at,
           segment,
           accepts_marketing
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (shop_id, shopify_customer_id)
         DO UPDATE SET
           orders_count = EXCLUDED.orders_count,
           total_spent = EXCLUDED.total_spent,
           customer_since = EXCLUDED.customer_since,
           last_order_at = EXCLUDED.last_order_at,
           segment = EXCLUDED.segment,
           accepts_marketing = EXCLUDED.accepts_marketing,
           updated_at = CURRENT_TIMESTAMP`,
        [
          shop.id,
          customer.shopifyCustomerId,
          customer.numberOfOrders,
          customer.amountSpent,
          customer.customerSince,
          customer.lastOrderAt,
          segment,
          customer.emailMarketingSubscribed,
        ],
      );
    } catch (error) {
      logger.error(
        "Failed to sync customer intelligence",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain, shopifyOrderId },
      );
      throw error;
    }
  }
}
