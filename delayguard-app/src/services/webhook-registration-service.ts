/**
 * Webhook Registration Service (launch/webhooks).
 *
 * DelayGuard installs via a custom authorization-code OAuth flow
 * (use_legacy_install_flow=true). That flow forbids app-specific webhook
 * subscriptions in shopify.app.toml, so the functional webhooks must be
 * registered PER-SHOP against the Admin GraphQL API right after OAuth
 * completes (see routes/auth.ts `/callback`).
 *
 * This service registers the three delay-detection topics via the
 * `webhookSubscriptionCreate` mutation and returns a structured result.
 * It NEVER throws — a webhook hiccup must not block a merchant's install
 * (the callback treats it as best-effort). Third-party invariant
 * (CLAUDE.md): each call is wrapped in an AbortController timeout, mirroring
 * the `ping()` pattern in email-service.ts / sms-service.ts.
 *
 * Callback URLs match the handler paths mounted in routes/webhooks.ts
 * (server.ts mounts that router at `/webhooks`):
 *   ORDERS_UPDATED       → /webhooks/orders/updated
 *   FULFILLMENTS_UPDATE  → /webhooks/fulfillments/updated
 *   ORDERS_PAID          → /webhooks/orders/paid
 */

import { logger } from "../utils/logger";

/**
 * Shopify Admin API version — kept in lockstep with shopify-service.ts
 * (2026-07 stable). Bump both together at the next API version window.
 */
const SHOPIFY_API_VERSION = "2026-07";

/** Per-request timeout for the Admin GraphQL call (third-party invariant). */
const REGISTRATION_TIMEOUT_MS = 10_000;

/**
 * The delay-detection webhook topics DelayGuard needs, paired with the
 * relative path of the handler that serves each (routes/webhooks.ts). The
 * GraphQL enum name is Shopify's `WebhookSubscriptionTopic`.
 */
export const WEBHOOK_TOPICS = [
  { topic: "ORDERS_UPDATED", path: "/webhooks/orders/updated" },
  // FULFILLMENTS_UPDATE, not …UPDATED (B9): Shopify's enum uses the past
  // tense for order topics but not fulfillment ones, and the live install
  // rejected FULFILLMENTS_UPDATED as "provided invalid value". The handler
  // path below is our own routing choice and is unaffected.
  { topic: "FULFILLMENTS_UPDATE", path: "/webhooks/fulfillments/updated" },
  { topic: "ORDERS_PAID", path: "/webhooks/orders/paid" },
] as const;

/**
 * Idempotency: `webhookSubscriptionCreate` returns a userError like
 * "Address for this topic has already been taken" when a subscription for
 * the same topic + callback already exists (e.g. a re-install / re-auth).
 * That is a SUCCESS, not a failure — the webhook is registered.
 */
const ALREADY_EXISTS_RE = /already been taken/i;

const WEBHOOK_SUBSCRIPTION_CREATE_MUTATION = `
  mutation webhookSubscriptionCreate(
    $topic: WebhookSubscriptionTopic!
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: $webhookSubscription
    ) {
      webhookSubscription {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface WebhookRegistrationResult {
  registered: string[];
  failed: { topic: string; reason: string }[];
}

interface WebhookUserError {
  field: string[] | null;
  message: string;
}

interface WebhookSubscriptionCreatePayload {
  webhookSubscriptionCreate: {
    webhookSubscription: { id: string } | null;
    userErrors: WebhookUserError[];
  } | null;
}

interface GraphQLTopLevelError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLTopLevelError[];
}

type RegisterOutcome = { ok: true } | { ok: false; reason: string };

/**
 * Stable public base URL for callback registration. Mirrors auth.ts
 * `appBaseUrl()` (decision D5): SHOPIFY_APP_URL, falling back to the
 * production host. Trailing slashes stripped so `${base}${path}` is clean.
 */
function appBaseUrl(): string {
  const url =
    process.env.SHOPIFY_APP_URL || "https://delayguard-api.vercel.app";
  return url.replace(/\/+$/, "");
}

function normalizeShopDomain(shopDomain: string): string {
  return shopDomain.includes(".myshopify.com")
    ? shopDomain
    : `${shopDomain}.myshopify.com`;
}

/**
 * Register one topic. Wrapped in an AbortController timeout and a
 * try/catch so it always resolves to a structured outcome — never throws.
 */
async function registerOne(
  endpoint: string,
  accessToken: string,
  topic: string,
  callbackUrl: string,
): Promise<RegisterOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    REGISTRATION_TIMEOUT_MS,
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: WEBHOOK_SUBSCRIPTION_CREATE_MUTATION,
        variables: {
          topic,
          webhookSubscription: { callbackUrl, format: "JSON" },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const json =
      (await response.json()) as GraphQLResponse<WebhookSubscriptionCreatePayload>;

    if (json.errors && json.errors.length > 0) {
      return {
        ok: false,
        reason: json.errors.map((e) => e.message).join(", "),
      };
    }

    const userErrors = json.data?.webhookSubscriptionCreate?.userErrors ?? [];
    if (userErrors.length > 0) {
      // Success only if EVERY userError is an "already taken" duplicate; a
      // single real error (e.g. bad callback URL) is a genuine failure.
      if (userErrors.every((e) => ALREADY_EXISTS_RE.test(e.message))) {
        return { ok: true };
      }
      return { ok: false, reason: userErrors.map((e) => e.message).join(", ") };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        reason: `timeout after ${REGISTRATION_TIMEOUT_MS}ms`,
      };
    }
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Register all delay-detection webhooks for a freshly-installed shop.
 *
 * @param shopDomain  The shop's myshopify.com domain (normalized if bare).
 * @param accessToken The offline access token from the OAuth exchange.
 * @returns Structured result: which topics registered, which failed + why.
 *   Never throws — callers treat registration as best-effort.
 */
export async function registerWebhooks(
  shopDomain: string,
  accessToken: string,
): Promise<WebhookRegistrationResult> {
  const normalizedDomain = normalizeShopDomain(shopDomain);
  const endpoint = `https://${normalizedDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const base = appBaseUrl();

  const registered: string[] = [];
  const failed: { topic: string; reason: string }[] = [];

  for (const { topic, path } of WEBHOOK_TOPICS) {
    const callbackUrl = `${base}${path}`;
    const outcome = await registerOne(
      endpoint,
      accessToken,
      topic,
      callbackUrl,
    );

    if (outcome.ok) {
      registered.push(topic);
    } else {
      failed.push({ topic, reason: outcome.reason });
      logger.warn("Webhook registration failed for topic", {
        shop: normalizedDomain,
        topic,
        reason: outcome.reason,
      });
    }
  }

  logger.info("Webhook registration complete", {
    shop: normalizedDomain,
    registered,
    failedCount: failed.length,
  });

  return { registered, failed };
}
