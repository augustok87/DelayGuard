/**
 * POST /api/test-alert — route tests for Phase 2.1.e
 *
 * Verifies the dashboard-only test-alert endpoint at the HTTP boundary:
 * session-token gate, request body parsing, success body shape, and
 * service-error mapping.
 *
 * Lives in its own file (not inside api-routes.test.ts) so the EmailService
 * and SMSService module mocks don't bleed into unrelated route suites.
 */

import request from "supertest";
import Koa from "koa";
import Router from "koa-router";
import bodyParser from "koa-bodyparser";
import jwt from "jsonwebtoken";

jest.mock("../../../services/email-service", () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendDelayEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock("../../../services/sms-service", () => ({
  SMSService: jest.fn().mockImplementation(() => ({
    sendDelaySMS: jest.fn().mockResolvedValue(undefined),
  })),
}));

// SMS is Pro+; TestAlertService now gates the SMS channel on the live plan
// tier (billing-leak defense). Mock an SMS-eligible plan so the boundary test
// still exercises the both-channels success shape without a real Admin API call.
jest.mock("../../../services/billing-service", () => ({
  billingService: {
    getCurrentPlan: jest.fn().mockResolvedValue("pro"),
    isSmsAllowed: jest.fn(() => true),
  },
}));

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

// Imported AFTER the mocks so api.ts module loads with the test doubles.
import { apiRoutes } from "../../../routes/api";

describe("POST /api/test-alert", () => {
  const testShop = "test-store.myshopify.com";
  const mockShopAuth = {
    id: "shop-123",
    access_token: "test-access-token",
    scope: "read_products,write_orders",
    shop_name: "Test Store",
  };
  const mockShopJoinRow = {
    merchant_email: "merchant@example.com",
    merchant_phone: "+15555550123",
    email_enabled: true,
    sms_enabled: true,
  };
  let app: Koa;
  let testToken: string;

  const mockAuth = (): void => {
    mockQuery.mockResolvedValueOnce([mockShopAuth]);
  };

  beforeAll(() => {
    process.env.SHOPIFY_API_SECRET = "test-secret";
    process.env.SHOPIFY_API_KEY = "test-api-key";
  });

  beforeEach(() => {
    app = new Koa();
    app.use(bodyParser());
    // Mirror server.ts: routers carry no prefix (LAUNCH_PLAN A3);
    // the mount point provides it.
    const root = new Router();
    root.use("/api", apiRoutes.routes());
    app.use(root.routes());
    app.use(root.allowedMethods());

    testToken = jwt.sign(
      {
        iss: `https://${testShop}/admin`,
        dest: `https://${testShop}`,
        aud: "test-api-key",
        sub: "user-123",
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        jti: "jwt-123",
        sid: "session-123",
      },
      "test-secret",
    );

    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it("returns 200 with channelsAttempted body for an authenticated dispatch", async() => {
    mockAuth();
    mockQuery.mockResolvedValueOnce([mockShopJoinRow]);

    const response = await request(app.callback())
      .post("/api/test-alert")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ delayType: "warehouse" })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: {
        channelsAttempted: ["email", "sms"],
        recipientEmail: "merchant@example.com",
        recipientPhone: "+15555550123",
      },
    });
  });

  it("returns 401 without a session token", async() => {
    const response = await request(app.callback())
      .post("/api/test-alert")
      .send({ delayType: "warehouse" })
      .expect(401);

    expect(response.body).toHaveProperty("error");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 404 when the shop is not in the database", async() => {
    mockAuth();
    mockQuery.mockResolvedValueOnce([]);

    const response = await request(app.callback())
      .post("/api/test-alert")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ delayType: "warehouse" })
      .expect(404);

    expect(response.body).toEqual({ error: "Shop not found" });
  });

  it("returns 400 with INVALID_DELAY_TYPE when delayType is missing or unknown", async() => {
    mockAuth();

    const response = await request(app.callback())
      .post("/api/test-alert")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ delayType: "bogus" })
      .expect(400);

    expect(response.body).toMatchObject({ code: "INVALID_DELAY_TYPE" });
  });

  it("forwards channels + recipient overrides from the request body", async() => {
    mockAuth();
    mockQuery.mockResolvedValueOnce([mockShopJoinRow]);

    const response = await request(app.callback())
      .post("/api/test-alert")
      .set("Authorization", `Bearer ${testToken}`)
      .send({
        delayType: "carrier",
        channels: ["email"],
        recipientEmail: "support@override.com",
      })
      .expect(200);

    expect(response.body.data).toEqual({
      channelsAttempted: ["email"],
      recipientEmail: "support@override.com",
      recipientPhone: "+15555550123",
    });
  });

  it("returns 500 when the underlying dispatch throws", async() => {
    mockAuth();
    mockQuery.mockRejectedValueOnce(new Error("DB exploded"));

    const response = await request(app.callback())
      .post("/api/test-alert")
      .set("Authorization", `Bearer ${testToken}`)
      .send({ delayType: "warehouse" })
      .expect(500);

    expect(response.body).toEqual({ error: "Failed to dispatch test alert" });
  });
});
