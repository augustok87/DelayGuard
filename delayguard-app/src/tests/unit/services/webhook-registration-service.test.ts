/**
 * Webhook Registration Service tests (launch/webhooks).
 *
 * TDD RED PHASE — written FIRST.
 *
 * DelayGuard uses a custom authorization-code OAuth flow
 * (use_legacy_install_flow=true), which forbids app-specific webhook
 * subscriptions in shopify.app.toml. The functional webhooks are therefore
 * registered per-shop via the Admin GraphQL `webhookSubscriptionCreate`
 * mutation right after OAuth.
 *
 * These tests mock global fetch (the GraphQL transport) and assert:
 *   - all three topics succeed
 *   - an "already been taken" userError is treated as SUCCESS (idempotent)
 *   - a real GraphQL userError is recorded as a failure
 *   - a network timeout (AbortError) is recorded as a failure, never thrown
 *   - the EXACT callback URLs + topic enums in each request payload
 */
import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

jest.mock("../../../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const SHOP = "test-shop.myshopify.com";
const ACCESS_TOKEN = "shpat_test_token";
const APP_URL = "https://delayguard-api.vercel.app";

const EXPECTED = [
  { topic: "ORDERS_UPDATED", callbackUrl: `${APP_URL}/webhooks/orders/updated` },
  {
    topic: "FULFILLMENTS_UPDATED",
    callbackUrl: `${APP_URL}/webhooks/fulfillments/updated`,
  },
  { topic: "ORDERS_PAID", callbackUrl: `${APP_URL}/webhooks/orders/paid` },
] as const;

/** A successful webhookSubscriptionCreate response for a fresh subscription. */
function okResponse(id = "gid://shopify/WebhookSubscription/1"): {
  ok: true;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: async() => ({
      data: {
        webhookSubscriptionCreate: {
          webhookSubscription: { id },
          userErrors: [],
        },
      },
    }),
  };
}

/** A userErrors response (idempotent duplicate or a real error). */
function userErrorResponse(message: string): {
  ok: true;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: async() => ({
      data: {
        webhookSubscriptionCreate: {
          webhookSubscription: null,
          userErrors: [{ field: ["callbackUrl"], message }],
        },
      },
    }),
  };
}

describe("webhook-registration-service", () => {
  let registerWebhooks: typeof import("../../../services/webhook-registration-service").registerWebhooks;
  // Typed function-mock (return Promise<unknown>) so mockResolvedValue accepts
  // our response fixtures without an `any` cast (see codebase guardrails).
  let mockFetch: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

  beforeEach(async() => {
    process.env.SHOPIFY_APP_URL = APP_URL;
    mockFetch = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    global.fetch = mockFetch as unknown as typeof fetch;
    jest.clearAllMocks();
    ({ registerWebhooks } = await import(
      "../../../services/webhook-registration-service"
    ));
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.SHOPIFY_APP_URL;
  });

  it("registers all three topics and returns them as registered", async() => {
    mockFetch.mockResolvedValue(okResponse());

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual([
      "ORDERS_UPDATED",
      "FULFILLMENTS_UPDATED",
      "ORDERS_PAID",
    ]);
    expect(result.failed).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("sends the exact Admin GraphQL endpoint, auth header, topic enums and callback URLs", async() => {
    mockFetch.mockResolvedValue(okResponse());

    await registerWebhooks(SHOP, ACCESS_TOKEN);

    EXPECTED.forEach((expected, index) => {
      const [url, options] = mockFetch.mock.calls[index] as [
        string,
        { method: string; headers: Record<string, string>; body: string },
      ];

      // Admin GraphQL endpoint on the shop domain, API version 2026-07.
      expect(url).toBe(
        `https://${SHOP}/admin/api/2026-07/graphql.json`,
      );
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["X-Shopify-Access-Token"]).toBe(ACCESS_TOKEN);

      const body = JSON.parse(options.body) as {
        query: string;
        variables: {
          topic: string;
          webhookSubscription: { callbackUrl: string; format: string };
        };
      };
      expect(body.query).toContain("webhookSubscriptionCreate");
      expect(body.variables.topic).toBe(expected.topic);
      expect(body.variables.webhookSubscription.callbackUrl).toBe(
        expected.callbackUrl,
      );
      expect(body.variables.webhookSubscription.format).toBe("JSON");
    });
  });

  it("falls back to the production app URL when SHOPIFY_APP_URL is unset", async() => {
    delete process.env.SHOPIFY_APP_URL;
    jest.resetModules();
    ({ registerWebhooks } = await import(
      "../../../services/webhook-registration-service"
    ));
    mockFetch.mockResolvedValue(okResponse());

    await registerWebhooks(SHOP, ACCESS_TOKEN);

    const [, options] = mockFetch.mock.calls[0] as [string, { body: string }];
    const body = JSON.parse(options.body) as {
      variables: { webhookSubscription: { callbackUrl: string } };
    };
    expect(body.variables.webhookSubscription.callbackUrl).toBe(
      "https://delayguard-api.vercel.app/webhooks/orders/updated",
    );
  });

  it("treats an 'already been taken' userError as SUCCESS (idempotent)", async() => {
    mockFetch
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(
        userErrorResponse(
          "Address for this topic has already been taken",
        ),
      )
      .mockResolvedValueOnce(okResponse());

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual([
      "ORDERS_UPDATED",
      "FULFILLMENTS_UPDATED",
      "ORDERS_PAID",
    ]);
    expect(result.failed).toEqual([]);
  });

  it("records a real GraphQL userError as a failure", async() => {
    mockFetch
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(userErrorResponse("Invalid callback URL"))
      .mockResolvedValueOnce(okResponse());

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual(["ORDERS_UPDATED", "ORDERS_PAID"]);
    expect(result.failed).toEqual([
      { topic: "FULFILLMENTS_UPDATED", reason: "Invalid callback URL" },
    ]);
  });

  it("records a network timeout as a failure without throwing", async() => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(okResponse())
      .mockRejectedValueOnce(abortError);

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual([
      "ORDERS_UPDATED",
      "FULFILLMENTS_UPDATED",
    ]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].topic).toBe("ORDERS_PAID");
    expect(result.failed[0].reason).toContain("timeout");
  });

  it("records a top-level GraphQL error as a failure", async() => {
    mockFetch
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async() => ({ errors: [{ message: "Throttled" }] }),
      })
      .mockResolvedValueOnce(okResponse());

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual(["ORDERS_UPDATED", "ORDERS_PAID"]);
    expect(result.failed).toEqual([
      { topic: "FULFILLMENTS_UPDATED", reason: "Throttled" },
    ]);
  });

  it("records a non-2xx HTTP response as a failure", async() => {
    mockFetch
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async() => ({}),
      });

    const result = await registerWebhooks(SHOP, ACCESS_TOKEN);

    expect(result.registered).toEqual([
      "ORDERS_UPDATED",
      "FULFILLMENTS_UPDATED",
    ]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].topic).toBe("ORDERS_PAID");
    expect(result.failed[0].reason).toContain("401");
  });
});
