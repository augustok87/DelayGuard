/**
 * OAuth routes — WS-C C2/C3.
 *
 * Covers the full authorize → callback walk at the HTTP boundary with a
 * mocked Shopify token endpoint (global fetch) and a mocked DB:
 *
 *   - GET /auth?shop=…       → 302 to Shopify authorize URL, sets the
 *     signed state cookie. Scopes come from config.shopify.scopes (C2),
 *     redirect_uri from SHOPIFY_APP_URL (C3, decision D5).
 *   - GET /auth/callback     → verifies the query HMAC (401 on failure)
 *     and the state nonce against the cookie (403 on mismatch), then
 *     exchanges the code for an access token and upserts the shop.
 *
 * Mounted through a wrapper router at the /auth prefix to mirror
 * server.ts:106 (`router.use('/auth', authRoutes.routes())`).
 */
import request from "supertest";
import crypto from "crypto";
import Koa from "koa";
import Router from "koa-router";

jest.mock("../../../database/connection");
import { query } from "../../../database/connection";
const mockQuery = query as jest.MockedFunction<typeof query>;

jest.mock("../../../utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Webhook registration is best-effort after install — mock it so the OAuth
// callback tests can assert it is invoked (and that a failure does not break
// the install redirect).
jest.mock("../../../services/webhook-registration-service", () => ({
  registerWebhooks: jest.fn(),
}));
import { registerWebhooks } from "../../../services/webhook-registration-service";
const mockRegisterWebhooks = registerWebhooks as jest.MockedFunction<
  typeof registerWebhooks
>;

process.env.SHOPIFY_APP_URL = "https://delayguard-api.vercel.app";

// Imported AFTER mocks + env so the route module loads the test doubles.
import { authRoutes } from "../../../routes/auth";

const SHOP = "test-shop.myshopify.com";
const API_SECRET = "test_api_secret"; // set in tests/setup/jest.setup.ts

function buildApp(): Koa {
  const app = new Koa();
  const root = new Router();
  root.use("/auth", authRoutes.routes());
  app.use(root.routes());
  app.use(root.allowedMethods());
  return app;
}

/** Sign callback query params the way Shopify does (hmac excluded, sorted). */
function signQuery(params: Record<string, string>): string {
  const message = Object.keys(params)
    .filter((key) => key !== "hmac")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHmac("sha256", API_SECRET).update(message).digest("hex");
}

function toQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

/** Walks GET /auth and returns the state param + Set-Cookie header. */
async function initiateOAuth(
  app: Koa,
): Promise<{ state: string; cookie: string; location: string }> {
  const res = await request(app.callback())
    .get(`/auth?shop=${SHOP}`)
    .expect(302);
  const location = res.headers.location;
  const state = new URL(location).searchParams.get("state") as string;
  const setCookies = res.headers["set-cookie"] as unknown as string[];
  const stateCookie = setCookies.find((c) =>
    c.startsWith("delayguard_oauth_state="),
  ) as string;
  return { state, cookie: stateCookie.split(";")[0], location };
}

describe("OAuth routes", () => {
  let app: Koa;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    app = buildApp();
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([]);
    mockRegisterWebhooks.mockReset();
    mockRegisterWebhooks.mockResolvedValue({ registered: [], failed: [] });
  });

  describe("GET /auth (authorize redirect)", () => {
    it("400s when the shop parameter is missing", async() => {
      await request(app.callback()).get("/auth").expect(400);
    });

    it("400s on a non-myshopify.com shop domain", async() => {
      await request(app.callback()).get("/auth?shop=evil.com").expect(400);
      await request(app.callback())
        .get("/auth?shop=evil.com%3Fx%3D.myshopify.com")
        .expect(400);
    });

    it("302s to the Shopify authorize URL with config-driven scopes and the stable redirect_uri", async() => {
      const { location } = await initiateOAuth(app);

      expect(location.startsWith(`https://${SHOP}/admin/oauth/authorize?`)).toBe(
        true,
      );

      const url = new URL(location);
      expect(url.searchParams.get("client_id")).toBe("test_api_key");

      // C2: scopes must come from config.shopify.scopes (defaults include
      // read_customers + read_products), never raw SHOPIFY_SCOPES env.
      const scope = url.searchParams.get("scope") as string;
      expect(scope).toContain("read_customers");
      expect(scope).toContain("read_products");
      expect(location).not.toContain("undefined");

      // C3 / D5: redirect URI is built from SHOPIFY_APP_URL, not VERCEL_URL.
      expect(url.searchParams.get("redirect_uri")).toBe(
        "https://delayguard-api.vercel.app/auth/callback",
      );

      // C3: a state nonce rides along.
      const state = url.searchParams.get("state") as string;
      expect(state).toMatch(/^[0-9a-f]{32}$/);
    });

    it("sets an httpOnly state cookie scoped to /auth", async() => {
      const res = await request(app.callback())
        .get(`/auth?shop=${SHOP}`)
        .expect(302);
      const setCookies = res.headers["set-cookie"] as unknown as string[];
      const stateCookie = setCookies.find((c) =>
        c.startsWith("delayguard_oauth_state="),
      ) as string;
      expect(stateCookie).toBeDefined();
      expect(stateCookie.toLowerCase()).toContain("httponly");
      expect(stateCookie.toLowerCase()).toContain("path=/auth");
    });

    it("generates a fresh state nonce per initiation", async() => {
      const first = await initiateOAuth(app);
      const second = await initiateOAuth(app);
      expect(first.state).not.toBe(second.state);
    });
  });

  describe("GET /auth/callback", () => {
    function callbackParams(
      state: string,
      overrides: Record<string, string> = {},
    ): Record<string, string> {
      const params = {
        code: "auth-code-123",
        shop: SHOP,
        state,
        timestamp: "1700000000",
        ...overrides,
      };
      return { ...params, hmac: signQuery(params) };
    }

    function mockTokenExchangeSuccess(): void {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async() => ({
          access_token: "shpat_from_exchange",
          scope: "read_orders,read_customers",
        }),
      });
    }

    it("walks authorize → callback: exchanges the code and upserts the shop", async() => {
      const { state, cookie } = await initiateOAuth(app);
      mockTokenExchangeSuccess();

      const res = await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(state))}`)
        .set("Cookie", cookie)
        .expect(302);

      // Token exchange hit Shopify's endpoint with our credentials.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [tokenUrl, tokenOptions] = mockFetch.mock.calls[0] as [
        string,
        { method: string; headers: Record<string, string>; body: string },
      ];
      expect(tokenUrl).toBe(`https://${SHOP}/admin/oauth/access_token`);
      expect(tokenOptions.method).toBe("POST");
      expect(tokenOptions.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(tokenOptions.body)).toEqual({
        client_id: "test_api_key",
        client_secret: "test_api_secret",
        code: "auth-code-123",
      });

      // Shop row persisted with the exchanged token (shops upsert is call 0).
      const [shopSql, shopParams] = mockQuery.mock.calls[0];
      expect(shopSql).toMatch(/INSERT\s+INTO\s+shops/i);
      expect(shopParams).toEqual([
        SHOP,
        "shpat_from_exchange",
        ["read_orders", "read_customers"],
      ]);

      // Merchant lands back in the embedded app.
      expect(res.headers.location).toBe(
        `https://${SHOP}/admin/apps/test_api_key`,
      );
    });

    it("registers per-shop webhooks with (shop, accessToken) after upserting the shop", async() => {
      const { state, cookie } = await initiateOAuth(app);
      mockTokenExchangeSuccess();

      await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(state))}`)
        .set("Cookie", cookie)
        .expect(302);

      expect(mockRegisterWebhooks).toHaveBeenCalledTimes(1);
      expect(mockRegisterWebhooks).toHaveBeenCalledWith(
        SHOP,
        "shpat_from_exchange",
      );
    });

    it("still completes the install redirect when webhook registration rejects (best-effort)", async() => {
      const { state, cookie } = await initiateOAuth(app);
      mockTokenExchangeSuccess();
      mockRegisterWebhooks.mockRejectedValueOnce(
        new Error("Shopify Admin API unavailable"),
      );

      const res = await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(state))}`)
        .set("Cookie", cookie)
        .expect(302);

      // The merchant still lands inside the embedded app despite the failure.
      expect(res.headers.location).toBe(
        `https://${SHOP}/admin/apps/test_api_key`,
      );
      expect(mockRegisterWebhooks).toHaveBeenCalledTimes(1);
    });

    it("403s when the state param does not match the cookie nonce", async() => {
      const { cookie } = await initiateOAuth(app);
      const forgedState = "f".repeat(32);

      await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(forgedState))}`)
        .set("Cookie", cookie)
        .expect(403);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("403s when the state cookie is missing entirely", async() => {
      const { state } = await initiateOAuth(app);

      await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(state))}`)
        .expect(403);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("401s on an invalid query hmac before any state or token work", async() => {
      const { state, cookie } = await initiateOAuth(app);
      const params = callbackParams(state, { hmac: "0".repeat(64) });
      params.hmac = "0".repeat(64);

      await request(app.callback())
        .get(`/auth/callback?${toQueryString(params)}`)
        .set("Cookie", cookie)
        .expect(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("400s on a malformed shop domain", async() => {
      const { state, cookie } = await initiateOAuth(app);

      await request(app.callback())
        .get(
          `/auth/callback?${toQueryString(callbackParams(state, { shop: "evil.com" }))}`,
        )
        .set("Cookie", cookie)
        .expect(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("400s when code or state is missing", async() => {
      await request(app.callback()).get(`/auth/callback?shop=${SHOP}`).expect(400);
    });

    it("502s when the token exchange fails upstream", async() => {
      const { state, cookie } = await initiateOAuth(app);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await request(app.callback())
        .get(`/auth/callback?${toQueryString(callbackParams(state))}`)
        .set("Cookie", cookie)
        .expect(502);
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });
});
