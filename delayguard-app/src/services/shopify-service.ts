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
 * 2026-07 (stable). Supported window as of 2026-07: 2025-10 → 2026-07.
 */
const SHOPIFY_API_VERSION = "2026-07";

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
 * Shopify GraphQL client interface.
 *
 * `query` is generic over the expected response shape — callers declare an
 * inline type for what their specific GraphQL query returns. Defaults to
 * `unknown` so a caller that forgets to type the response is forced to narrow
 * before accessing fields. Wave 3.5 typing rule.
 */
interface ShopifyGraphQLError {
  message: string;
}

interface ShopifyGraphQLResponse<T = unknown> {
  data?: T;
  errors?: ShopifyGraphQLError[];
}

interface ShopifyGraphQLClient {
  query: <T = unknown>(
    queryString: string,
    variables?: Record<string, unknown>,
  ) => Promise<ShopifyGraphQLResponse<T>>;
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
    query: async<T = unknown>(
      queryString: string,
      variables: Record<string, unknown> = {},
    ): Promise<ShopifyGraphQLResponse<T>> => {
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

      const json = (await response.json()) as ShopifyGraphQLResponse<T>;

      // Handle GraphQL errors
      if (json.errors && json.errors.length > 0) {
        const errorMessages = json.errors
          .map((e: ShopifyGraphQLError) => e.message)
          .join(", ");
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
 * Convert customer ID to Shopify GID format if needed.
 *
 * @param customerId - Numeric customer ID or GID format
 * @returns GID format (e.g., "gid://shopify/Customer/123456789")
 */
function normalizeCustomerId(customerId: string): string {
  if (customerId.startsWith("gid://")) {
    return customerId;
  }
  return `gid://shopify/Customer/${customerId}`;
}

/**
 * Customer intelligence data fetched from Shopify — Phase 2.1.a.
 *
 * Wire field names normalized to camelCase + parsed types (numeric wire
 * values arrive as strings in the GraphQL response, Date for timestamps).
 * The downstream deriveSegment() pure function takes a subset of this
 * shape.
 */
export interface CustomerIntelligenceData {
  shopifyCustomerId: string;
  email: string | null;
  /** Lifetime order count — GraphQL `numberOfOrders` (UnsignedInt64 string) parsed to number. */
  numberOfOrders: number;
  /** Lifetime spend in shop currency — GraphQL `amountSpent.amount` (MoneyV2 Decimal string) parsed to number. */
  amountSpent: number;
  customerSince: Date;
  lastOrderAt: Date | null;
  /** True iff `emailMarketingConsent.marketingState === "SUBSCRIBED"`. */
  emailMarketingSubscribed: boolean;
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

    // Inline response shape matches the `GetOrderWithProducts` query above —
    // Wave 3.5 typing rule (consumers declare what each query returns).
    interface OrderLineItemNode {
      id: string;
      title: string;
      variantTitle: string | null;
      quantity: number;
      originalUnitPrice: string;
      image: { url: string; altText: string | null } | null;
      product: { id: string; productType: string | null; vendor: string | null } | null;
      sku: string | null;
    }
    interface OrderLineItemsQueryResponse {
      order: {
        id: string;
        lineItems: { edges: Array<{ node: OrderLineItemNode }> };
      } | null;
    }

    const response = await client.query<OrderLineItemsQueryResponse>(query, {
      orderId: orderGid,
    });

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
    const lineItems: OrderLineItem[] = order.lineItems.edges.map((edge) => {
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
    });

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
 * Fetch a Shopify customer's lifetime stats via the Customer GraphQL query.
 *
 * Phase 2.1.a — Customer Intelligence. Sibling to fetchOrderLineItems
 * above: reuses createGraphQLClient + the Wave 3.5 generic query<T> so
 * the response shape is typed at the call site, not the client.
 *
 * Field semantics (Admin API 2026-07):
 *   - numberOfOrders: lifetime order count (UnsignedInt64 — serialized
 *     as a String in JSON, parsed to a number here)
 *   - amountSpent: lifetime spend (MoneyV2 { amount currencyCode };
 *     amount is a Decimal string, parsed to a number here)
 *   - emailMarketingConsent.marketingState: email opt-in state enum —
 *     emailMarketingSubscribed derives from `=== "SUBSCRIBED"`.
 *     NOTE: `emailMarketingConsent` is deprecated-but-present in
 *     2026-07 and its successor field is unnamed in the docs as of
 *     2026-07-21 — re-check at the next API version bump.
 *   - createdAt: customer creation timestamp → customerSince
 *   - lastOrder.createdAt: most recent order timestamp → lastOrderAt
 *
 * @returns The normalized intelligence record, or null when Shopify
 *   reports the customer no longer exists (data.customer === null).
 * @throws Error on 401 / 429 / 5xx — same propagation pattern as
 *   fetchOrderLineItems (createGraphQLClient handles it once).
 */
export async function fetchCustomerById(
  shopDomain: string,
  accessToken: string,
  shopifyCustomerId: string,
): Promise<CustomerIntelligenceData | null> {
  logger.debug("Fetching customer intelligence from Shopify", {
    shop: shopDomain,
    customerId: shopifyCustomerId,
  });

  const client = await createGraphQLClient(shopDomain, accessToken);
  const customerGid = normalizeCustomerId(shopifyCustomerId);

  // emailMarketingConsent is deprecated-but-present in 2026-07; its
  // successor is unnamed in shopify.dev docs as of 2026-07-21 — re-check
  // at the next SHOPIFY_API_VERSION bump.
  const queryString = `
    query GetCustomerById($customerId: ID!) {
      customer(id: $customerId) {
        id
        firstName
        lastName
        email
        numberOfOrders
        amountSpent {
          amount
          currencyCode
        }
        emailMarketingConsent {
          marketingState
        }
        createdAt
        lastOrder {
          createdAt
        }
      }
    }
  `;

  // Inline response shape for the GetCustomerById query — Wave 3.5
  // typing rule (callers declare what each query returns).
  interface CustomerNode {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    /** UnsignedInt64 — serialized as a string in the JSON response. */
    numberOfOrders: string;
    /** MoneyV2 — amount is a Decimal string. */
    amountSpent: { amount: string; currencyCode: string };
    emailMarketingConsent: { marketingState: string } | null;
    createdAt: string;
    lastOrder: { createdAt: string } | null;
  }
  interface CustomerQueryResponse {
    customer: CustomerNode | null;
  }

  const response = await client.query<CustomerQueryResponse>(queryString, {
    customerId: customerGid,
  });

  if (!response.data || !response.data.customer) {
    logger.info("Customer not found in Shopify", {
      shop: shopDomain,
      customerId: shopifyCustomerId,
    });
    return null;
  }

  const c = response.data.customer;
  return {
    shopifyCustomerId: c.id,
    email: c.email,
    numberOfOrders: parseInt(c.numberOfOrders, 10),
    amountSpent: parseFloat(c.amountSpent.amount),
    customerSince: new Date(c.createdAt),
    lastOrderAt: c.lastOrder ? new Date(c.lastOrder.createdAt) : null,
    emailMarketingSubscribed:
      c.emailMarketingConsent?.marketingState === "SUBSCRIBED",
  };
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
