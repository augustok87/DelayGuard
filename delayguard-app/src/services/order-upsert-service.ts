/**
 * Order upsert service
 *
 * Owns every orders-table write that previously lived inline in
 * routes/webhooks.ts (processOrderUpdate, processOrderPaid,
 * processFulfillmentUpdate's order lookup). Backend rule
 * (.claude/rules/backend.md): SQL belongs in services, routes stay thin.
 *
 * Silent-skip semantics (preserved verbatim from the pre-refactor
 * route): a missing shop or missing order returns null/false instead of
 * throwing. Webhook flows are different from the merchant API: Shopify
 * retries on non-2xx, so throwing on shop-not-found would cause retry
 * storms for shops that uninstalled. The MerchantApiService's
 * ShopNotFoundError → 404 contract intentionally does NOT apply here.
 *
 * v1.19 field-population rule (backend.md): the sibling test asserts
 * every persisted column appears in the SQL parameter array.
 */
import { query } from "../database/connection";
import { logger } from "../utils/logger";

interface ShopifyCustomer {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

/**
 * Shopify money-set shape (Phase 2.1.c). Order webhooks send shipping as a
 * nested `total_shipping_price_set: { shop_money, presentment_money }` rather
 * than a flat string. We persist `shop_money` (merchant settlement currency),
 * matching the 2.1.b precedent that `total_price` (flat string) is also shop
 * currency. `presentment_money` is intentionally unused — buyer-display
 * currency conversion is out of scope until Phase 2.2+ if it earns its keep.
 */
interface ShopifyMoneySet {
  shop_money?: { amount?: string; currency_code?: string };
  presentment_money?: { amount?: string; currency_code?: string };
}

export interface OrderWebhookPayload {
  id: number;
  name: string;
  customer?: ShopifyCustomer;
  fulfillment_status?: string;
  /** Shopify webhook serialises money as a string (e.g. "199.99"). Phase
   * 2.1.b parses to a number for `orders.total_amount`; null on absent. */
  total_price?: string;
  /** Phase 2.1.c — order-level financial breakdown. Three flat strings + one
   * nested money-set for shipping. All parsed to `number | null`. */
  subtotal_price?: string;
  total_tax?: string;
  total_discounts?: string;
  total_shipping_price_set?: ShopifyMoneySet;
}

export interface OrderUpsertResult {
  orderId: string;
  accessToken: string;
}

function buildCustomerName(customer: ShopifyCustomer | undefined): string {
  if (customer?.first_name && customer?.last_name) {
    return `${customer.first_name} ${customer.last_name}`;
  }
  return customer?.first_name || "Unknown";
}

function parseTotalPrice(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMoneySet(value: ShopifyMoneySet | undefined): number | null {
  // Defensive narrowing: webhook payloads are user-controlled, so the entire
  // money-set, the shop_money branch, and the amount string may each be
  // absent. parseTotalPrice handles the final non-finite check.
  return parseTotalPrice(value?.shop_money?.amount);
}

export class OrderUpsertService {
  private async resolveShopWithToken(
    shopDomain: string,
  ): Promise<{ id: string; access_token: string } | null> {
    const rows = await query<{ id: string; access_token: string }>(
      "SELECT id, access_token FROM shops WHERE shop_domain = $1",
      [shopDomain],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  private async resolveShopId(shopDomain: string): Promise<string | null> {
    const rows = await query<{ id: string }>(
      "SELECT id FROM shops WHERE shop_domain = $1",
      [shopDomain],
    );
    return rows.length > 0 ? rows[0].id : null;
  }

  async upsertOrderFromWebhook(
    shopDomain: string,
    orderData: OrderWebhookPayload,
  ): Promise<OrderUpsertResult | null> {
    try {
      const shop = await this.resolveShopWithToken(shopDomain);
      if (!shop) {
        // Silent-skip: Shopify retries on non-2xx, so a missing shop must
        // not throw. Caller returns 200.
        logger.info("Shop not found, skipping order upsert", { shopDomain });
        return null;
      }

      // Phase 2.1.a: shopify_customer_id stays null when customer.id is
      // absent (guest checkout). CustomerSyncService keys off this null to
      // skip the sync — see services/customer-sync-service.ts.
      const shopifyCustomerId =
        typeof orderData.customer?.id === "number"
          ? orderData.customer.id.toString()
          : null;

      await query(
        `INSERT INTO orders (
           shop_id,
           shopify_order_id,
           order_number,
           customer_name,
           customer_email,
           customer_phone,
           shopify_customer_id,
           status,
           total_amount,
           subtotal_price,
           total_tax,
           total_discounts,
           total_shipping_price
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (shop_id, shopify_order_id)
         DO UPDATE SET
           order_number = EXCLUDED.order_number,
           customer_name = EXCLUDED.customer_name,
           customer_email = EXCLUDED.customer_email,
           customer_phone = EXCLUDED.customer_phone,
           shopify_customer_id = EXCLUDED.shopify_customer_id,
           status = EXCLUDED.status,
           total_amount = EXCLUDED.total_amount,
           subtotal_price = EXCLUDED.subtotal_price,
           total_tax = EXCLUDED.total_tax,
           total_discounts = EXCLUDED.total_discounts,
           total_shipping_price = EXCLUDED.total_shipping_price,
           updated_at = CURRENT_TIMESTAMP`,
        [
          shop.id,
          orderData.id.toString(),
          orderData.name,
          buildCustomerName(orderData.customer),
          orderData.customer?.email,
          orderData.customer?.phone,
          shopifyCustomerId,
          orderData.fulfillment_status || "unfulfilled",
          parseTotalPrice(orderData.total_price),
          parseTotalPrice(orderData.subtotal_price),
          parseTotalPrice(orderData.total_tax),
          parseTotalPrice(orderData.total_discounts),
          parseMoneySet(orderData.total_shipping_price_set),
        ],
      );

      const orderRows = await query<{ id: string }>(
        "SELECT id FROM orders WHERE shop_id = $1 AND shopify_order_id = $2",
        [shop.id, orderData.id.toString()],
      );

      if (orderRows.length === 0) {
        // Shouldn't happen — we just upserted — but fail loudly so Shopify retries
        throw new Error(
          `Order ${orderData.id} not found after upsert for shop ${shopDomain}`,
        );
      }

      return {
        orderId: orderRows[0].id,
        accessToken: shop.access_token,
      };
    } catch (error) {
      logger.error(
        "Failed to upsert order from webhook",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain, shopifyOrderId: orderData.id },
      );
      throw error;
    }
  }

  async markOrderAsPaid(
    shopDomain: string,
    orderData: OrderWebhookPayload,
  ): Promise<boolean> {
    try {
      const shopId = await this.resolveShopId(shopDomain);
      if (!shopId) {
        // Silent-skip — see upsertOrderFromWebhook for rationale.
        logger.info("Shop not found, skipping order paid", { shopDomain });
        return false;
      }

      await query(
        `UPDATE orders
         SET status = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE shop_id = $2
           AND shopify_order_id = $3`,
        ["paid", shopId, orderData.id.toString()],
      );

      return true;
    } catch (error) {
      logger.error(
        "Failed to mark order as paid",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain, shopifyOrderId: orderData.id },
      );
      throw error;
    }
  }

  async findOrderId(
    shopDomain: string,
    shopifyOrderId: string,
  ): Promise<string | null> {
    try {
      const shopId = await this.resolveShopId(shopDomain);
      if (!shopId) {
        logger.info("Shop not found, skipping order lookup", { shopDomain });
        return null;
      }

      const orderRows = await query<{ id: string }>(
        "SELECT id FROM orders WHERE shop_id = $1 AND shopify_order_id = $2",
        [shopId, shopifyOrderId],
      );

      if (orderRows.length === 0) {
        logger.info("Order not found for fulfillment update", {
          shopDomain,
          shopifyOrderId,
        });
        return null;
      }

      return orderRows[0].id;
    } catch (error) {
      logger.error(
        "Failed to find order by Shopify ID",
        error instanceof Error ? error : new Error(String(error)),
        { shopDomain, shopifyOrderId },
      );
      throw error;
    }
  }
}
