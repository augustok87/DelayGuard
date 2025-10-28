/**
 * Shopify Service (Phase 1.2)
 *
 * GraphQL API integration for fetching product information from Shopify.
 *
 * This service handles:
 * - GraphQL client creation for authenticated shops
 * - Fetching order line items (products) from Shopify Admin API
 * - Data transformation from Shopify format to internal database format
 * - Saving line items to PostgreSQL database
 * - Error handling and rate limit management
 *
 * Implements IMPLEMENTATION_PLAN.md Phase 1.2 requirements
 */

import { logger } from "../utils/logger";
import { query } from "../database/connection";

/**
 * Shopify API version to use
 * Using 2024-01 (stable version with lineItems support)
 */
const SHOPIFY_API_VERSION = "2024-01";

/**
 * Internal representation of order line item
 */
export interface OrderLineItem {
  shopifyLineItemId: string;
  productId: string;
  title: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  price: number;
  productType: string | null;
  vendor: string | null;
  imageUrl: string | null;
}

/**
 * Shopify GraphQL client interface
 */
interface ShopifyGraphQLClient {
  query: (queryString: string, variables: Record<string, any>) => Promise<any>;
}

/**
 * Create a GraphQL client for a specific shop
 *
 * @param shopDomain - The shop's domain (e.g., "example.myshopify.com")
 * @param accessToken - OAuth access token for the shop
 * @returns GraphQL client with query method
 * @throws Error if shop domain or access token is missing
 */
export async function createGraphQLClient(
  shopDomain: string,
  accessToken: string,
): Promise<ShopifyGraphQLClient> {
  if (!shopDomain || shopDomain.trim() === "") {
    throw new Error("Shop domain is required");
  }

  if (!accessToken || accessToken.trim() === "") {
    throw new Error("Access token is required");
  }

  // Normalize shop domain to include .myshopify.com
  const normalizedDomain = shopDomain.includes(".myshopify.com")
    ? shopDomain
    : `${shopDomain}.myshopify.com`;

  logger.debug("Creating Shopify GraphQL client", {
    shop: normalizedDomain,
  });

  return {
    query: async(queryString: string, variables: Record<string, any> = {}) => {
      const url = `https://${normalizedDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: queryString,
          variables,
        }),
      });

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            `Unauthorized: Invalid access token for ${normalizedDomain}`,
          );
        }
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After") || "unknown";
          throw new Error(
            `Rate limit exceeded. Retry after: ${retryAfter} seconds`,
          );
        }
        throw new Error(
          `Shopify API error: ${response.status} ${response.statusText}`,
        );
      }

      const json = await response.json();

      // Handle GraphQL errors
      if (json.errors && json.errors.length > 0) {
        const errorMessages = json.errors.map((e: any) => e.message).join(", ");
        throw new Error(`GraphQL error: ${errorMessages}`);
      }

      return json;
    },
  };
}

/**
 * Convert order ID to Shopify GID format if needed
 *
 * @param orderId - Numeric order ID or GID format
 * @returns GID format (e.g., "gid://shopify/Order/123456789")
 */
function normalizeOrderId(orderId: string): string {
  if (orderId.startsWith("gid://")) {
    return orderId;
  }
  return `gid://shopify/Order/${orderId}`;
}

/**
 * Fetch order line items from Shopify GraphQL API
 *
 * @param shopDomain - The shop's domain
 * @param accessToken - OAuth access token
 * @param shopifyOrderId - Shopify order ID (numeric or GID format)
 * @returns Array of order line items in internal format
 * @throws Error if API request fails
 */
export async function fetchOrderLineItems(
  shopDomain: string,
  accessToken: string,
  shopifyOrderId: string,
): Promise<OrderLineItem[]> {
  try {
    logger.debug("Fetching order line items from Shopify", {
      shop: shopDomain,
      orderId: shopifyOrderId,
    });

    const client = await createGraphQLClient(shopDomain, accessToken);
    const orderGid = normalizeOrderId(shopifyOrderId);

    // GraphQL query from IMPLEMENTATION_PLAN.md Phase 1.2
    const query = `
      query GetOrderWithProducts($orderId: ID!) {
        order(id: $orderId) {
          id
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                variantTitle
                quantity
                originalUnitPrice
                image {
                  url
                  altText
                }
                product {
                  id
                  productType
                  vendor
                }
                sku
              }
            }
          }
        }
      }
    `;

    const response = await client.query(query, { orderId: orderGid });

    // Handle case where order is not found
    if (!response.data || !response.data.order) {
      logger.warn("Order not found in Shopify", {
        shop: shopDomain,
        orderId: shopifyOrderId,
      });
      return [];
    }

    const order = response.data.order;

    // Handle case where order has no line items
    if (
      !order.lineItems ||
      !order.lineItems.edges ||
      order.lineItems.edges.length === 0
    ) {
      logger.debug("Order has no line items", {
        shop: shopDomain,
        orderId: shopifyOrderId,
      });
      return [];
    }

    // Transform Shopify format to internal format
    const lineItems: OrderLineItem[] = order.lineItems.edges.map(
      (edge: any) => {
        const node = edge.node;
        return {
          shopifyLineItemId: node.id,
          productId: node.product?.id || "",
          title: node.title,
          variantTitle: node.variantTitle || null,
          sku: node.sku || null,
          quantity: node.quantity,
          price: parseFloat(node.originalUnitPrice),
          productType: node.product?.productType || null,
          vendor: node.product?.vendor || null,
          imageUrl: node.image?.url || null,
        };
      },
    );

    logger.info(`Fetched ${lineItems.length} line items from Shopify`, {
      shop: shopDomain,
      orderId: shopifyOrderId,
      count: lineItems.length,
    });

    return lineItems;
  } catch (error) {
    logger.error(
      "Error fetching order line items from Shopify",
      error as Error,
      {
        shop: shopDomain,
        orderId: shopifyOrderId,
      },
    );
    throw error;
  }
}

/**
 * Save order line items to database
 *
 * Uses UPSERT (ON CONFLICT) to handle duplicate line items gracefully.
 *
 * @param orderId - Internal database order ID
 * @param shopDomain - The shop's domain
 * @param accessToken - OAuth access token
 * @param shopifyOrderId - Shopify order ID
 * @throws Error if database operation fails
 */
export async function saveOrderLineItems(
  orderId: number,
  shopDomain: string,
  accessToken: string,
  shopifyOrderId: string,
): Promise<void> {
  try {
    // Fetch line items from Shopify
    const lineItems = await fetchOrderLineItems(
      shopDomain,
      accessToken,
      shopifyOrderId,
    );

    if (lineItems.length === 0) {
      logger.debug("No line items to save", { orderId });
      return;
    }

    logger.debug(`Saving ${lineItems.length} line items to database`, {
      orderId,
    });

    // Save each line item to database using UPSERT
    for (const item of lineItems) {
      await query(
        `
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
          image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (order_id, shopify_line_item_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          variant_title = EXCLUDED.variant_title,
          sku = EXCLUDED.sku,
          quantity = EXCLUDED.quantity,
          price = EXCLUDED.price,
          product_type = EXCLUDED.product_type,
          vendor = EXCLUDED.vendor,
          image_url = EXCLUDED.image_url,
          updated_at = CURRENT_TIMESTAMP
        `,
        [
          orderId,
          item.shopifyLineItemId,
          item.productId,
          item.title,
          item.variantTitle,
          item.sku,
          item.quantity,
          item.price,
          item.productType,
          item.vendor,
          item.imageUrl,
        ],
      );
    }

    logger.info(`Saved ${lineItems.length} line items to database`, {
      orderId,
      count: lineItems.length,
    });
  } catch (error) {
    logger.error("Error saving order line items to database", error as Error, {
      orderId,
      shopDomain,
      shopifyOrderId,
    });
    throw error;
  }
}
