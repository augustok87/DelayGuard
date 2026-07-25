/**
 * GET /api/plan + plan-gating tests — LAUNCH_PLAN WS-F F1.
 *
 * The plan endpoint surfaces the shop's current Shopify App Pricing tier
 * (resolved server-side by BillingService, which fails closed to "free").
 * SMS is a paid feature: the test-alert SMS channel and enabling
 * app_settings.sms_enabled are both gated on plan >= pro.
 *
 * Lives in its own file so the billing-service module mock doesn't bleed
 * into api-routes.test.ts.
 */

import request from 'supertest';
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import jwt from 'jsonwebtoken';

jest.mock('../../../services/email-service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendDelayEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('../../../services/sms-service', () => ({
  SMSService: jest.fn().mockImplementation(() => ({
    sendDelaySMS: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../database/connection');
import { query } from '../../../database/connection';
const mockQuery = query as jest.MockedFunction<typeof query>;

jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../../services/billing-service', () => ({
  billingService: {
    getCurrentPlan: jest.fn(),
    getPlanConfig: jest.fn(),
    isSmsAllowed: jest.fn(),
    meetsPlan: jest.fn(),
  },
}));
import { billingService } from '../../../services/billing-service';
const mockBilling = billingService as jest.Mocked<typeof billingService>;

// Imported AFTER the mocks so api.ts module loads with the test doubles.
import { apiRoutes } from '../../../routes/api';

describe('plan gating (/api/plan, SMS gates)', () => {
  const testShop = 'test-store.myshopify.com';
  const mockShopAuth = {
    id: 'shop-123',
    access_token: 'test-access-token',
    scope: 'read_products,write_orders',
    shop_name: 'Test Store',
  };
  const proPlanConfig = {
    name: 'Pro Plan',
    price: 7,
    trial_days: 14,
    features: ['Unlimited delay alerts'],
  };
  let app: Koa;
  let testToken: string;

  const mockAuth = (): void => {
    mockQuery.mockResolvedValueOnce([mockShopAuth]);
  };

  /** Configure the mocked billing service for a given resolved tier. */
  const mockPlan = (tier: 'free' | 'pro' | 'enterprise'): void => {
    mockBilling.getCurrentPlan.mockResolvedValue(tier);
    mockBilling.isSmsAllowed.mockReturnValue(tier !== 'free');
    mockBilling.getPlanConfig.mockReturnValue(proPlanConfig);
  };

  beforeAll(() => {
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    process.env.SHOPIFY_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    app = new Koa();
    app.use(bodyParser());
    // Mirror server.ts: the router carries no prefix (LAUNCH_PLAN A3); the
    // mount point supplies /api.
    const root = new Router();
    root.use('/api', apiRoutes.routes(), apiRoutes.allowedMethods());
    app.use(root.routes());
    app.use(root.allowedMethods());

    testToken = jwt.sign(
      {
        iss: `https://${testShop}/admin`,
        dest: `https://${testShop}`,
        aud: 'test-api-key',
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        jti: 'jwt-123',
        sid: 'session-123',
      },
      'test-secret',
    );

    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('GET /api/plan', () => {
    it.each(['free', 'pro', 'enterprise'] as const)(
      'returns the resolved %s tier with gate flags',
      async(tier) => {
        mockAuth();
        mockPlan(tier);

        const response = await request(app.callback())
          .get('/api/plan')
          .set('Authorization', `Bearer ${testToken}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: {
            plan: tier,
            smsAllowed: tier !== 'free',
            planConfig: proPlanConfig,
          },
        });
        expect(mockBilling.getCurrentPlan).toHaveBeenCalledWith(testShop);
      },
    );

    it('returns 401 without a session token', async() => {
      await request(app.callback()).get('/api/plan').expect(401);
      expect(mockBilling.getCurrentPlan).not.toHaveBeenCalled();
    });

    it('returns 500 when plan resolution throws unexpectedly', async() => {
      mockAuth();
      mockBilling.getCurrentPlan.mockRejectedValue(new Error('boom'));

      const response = await request(app.callback())
        .get('/api/plan')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to resolve plan' });
    });
  });

  describe('POST /api/test-alert SMS gate', () => {
    it('rejects an explicit sms channel request on the free tier', async() => {
      mockAuth();
      mockPlan('free');

      const response = await request(app.callback())
        .post('/api/test-alert')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ delayType: 'warehouse', channels: ['sms'] })
        .expect(403);

      expect(response.body).toMatchObject({ code: 'PLAN_UPGRADE_REQUIRED' });
    });

    it('allows the sms channel on the pro tier', async() => {
      mockAuth();
      mockPlan('pro');
      // TestAlertService shop + settings join row
      mockQuery.mockResolvedValueOnce([
        {
          merchant_email: 'merchant@example.com',
          merchant_phone: '+15555550123',
          email_enabled: true,
          sms_enabled: true,
        },
      ]);

      const response = await request(app.callback())
        .post('/api/test-alert')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ delayType: 'warehouse', channels: ['sms'] })
        .expect(200);

      expect(response.body.data.channelsAttempted).toEqual(['sms']);
    });

    it('does not consult the plan for an email-only request', async() => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([
        {
          merchant_email: 'merchant@example.com',
          merchant_phone: null,
          email_enabled: true,
          sms_enabled: false,
        },
      ]);

      await request(app.callback())
        .post('/api/test-alert')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ delayType: 'warehouse', channels: ['email'] })
        .expect(200);

      expect(mockBilling.getCurrentPlan).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/settings SMS gate', () => {
    it('rejects enabling sms_enabled on the free tier', async() => {
      mockAuth();
      mockPlan('free');

      const response = await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ sms_enabled: true })
        .expect(403);

      expect(response.body).toMatchObject({ code: 'PLAN_UPGRADE_REQUIRED' });
    });

    it('allows enabling sms_enabled on the pro tier', async() => {
      mockAuth();
      mockPlan('pro');
      // MerchantApiService.resolveShopId + UPDATE
      mockQuery.mockResolvedValueOnce([{ id: mockShopAuth.id }]);
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ sms_enabled: true })
        .expect(200);
    });

    it('does not consult the plan when disabling sms', async() => {
      mockAuth();
      mockQuery.mockResolvedValueOnce([{ id: mockShopAuth.id }]);
      mockQuery.mockResolvedValueOnce([]);

      await request(app.callback())
        .put('/api/settings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ sms_enabled: false })
        .expect(200);

      expect(mockBilling.getCurrentPlan).not.toHaveBeenCalled();
    });
  });
});
