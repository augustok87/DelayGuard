/**
 * Billing Service Tests — Shopify App Pricing plan gate (LAUNCH_PLAN WS-F F1)
 *
 * The old fake-charge / local-subscriptions flow is deleted. BillingService
 * is now a thin plan-gate: it reads the shop's current subscription from the
 * Shopify Admin GraphQL API (currentAppInstallation.activeSubscriptions) and
 * maps it to a plan tier. On ANY failure it FAILS CLOSED to the free tier.
 */

import { BillingService } from '../../../services/billing-service';
import { query } from '../../../database/connection';
import { createGraphQLClient } from '../../../services/shopify-service';

// Mock dependencies
jest.mock('../../../database/connection');
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('../../../services/shopify-service', () => ({
  createGraphQLClient: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCreateGraphQLClient = createGraphQLClient as jest.MockedFunction<
  typeof createGraphQLClient
>;

const testShop = 'test-store.myshopify.com';

/** Queue the shops access-token lookup that getCurrentPlan performs. */
const mockShopTokenLookup = (): void => {
  mockQuery.mockResolvedValueOnce([{ access_token: 'shpat_test-token' }]);
};

/** Wire the GraphQL client mock to return the given active subscriptions. */
const mockActiveSubscriptions = (
  subscriptions: Array<{ name: string; status: string }>,
): jest.Mock => {
  const graphqlQuery = jest.fn().mockResolvedValue({
    data: {
      currentAppInstallation: {
        activeSubscriptions: subscriptions,
      },
    },
  });
  mockCreateGraphQLClient.mockResolvedValue({ query: graphqlQuery });
  return graphqlQuery;
};

describe('BillingService (plan gate)', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockCreateGraphQLClient.mockReset();
  });

  describe('getPlanConfig', () => {
    it('returns the free plan configuration', () => {
      const plan = billingService.getPlanConfig('free');
      expect(plan.name).toBe('Free Plan');
      expect(plan.price).toBe(0);
      expect(plan.monthly_alert_limit).toBe(50);
    });

    it('returns the pro plan configuration at $7', () => {
      const plan = billingService.getPlanConfig('pro');
      expect(plan.name).toBe('Pro Plan');
      expect(plan.price).toBe(7);
    });

    it('returns the enterprise plan configuration at $25', () => {
      const plan = billingService.getPlanConfig('enterprise');
      expect(plan.name).toBe('Enterprise Plan');
      expect(plan.price).toBe(25);
    });

    it('throws for an invalid plan name', () => {
      expect(() => billingService.getPlanConfig('invalid' as 'free')).toThrow(
        'Invalid plan name: invalid',
      );
    });
  });

  describe('getCurrentPlan', () => {
    it('returns "pro" when the shop has an active Pro subscription', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([{ name: 'Pro Plan', status: 'ACTIVE' }]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'pro',
      );
      expect(mockCreateGraphQLClient).toHaveBeenCalledWith(
        testShop,
        'shpat_test-token',
      );
    });

    it('returns "enterprise" when the shop has an active Enterprise subscription', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([{ name: 'Enterprise Plan', status: 'ACTIVE' }]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'enterprise',
      );
    });

    it('queries currentAppInstallation.activeSubscriptions with name and status', async() => {
      mockShopTokenLookup();
      const graphqlQuery = mockActiveSubscriptions([
        { name: 'Pro Plan', status: 'ACTIVE' },
      ]);

      await billingService.getCurrentPlan(testShop);

      const queryString = graphqlQuery.mock.calls[0][0] as string;
      expect(queryString).toContain('currentAppInstallation');
      expect(queryString).toContain('activeSubscriptions');
      expect(queryString).toContain('name');
      expect(queryString).toContain('status');
    });

    it('returns "free" when there are no active subscriptions', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('ignores non-ACTIVE subscriptions (fail closed)', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([
        { name: 'Pro Plan', status: 'CANCELLED' },
        { name: 'Enterprise Plan', status: 'FROZEN' },
      ]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('maps subscription names case-insensitively', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([{ name: 'DelayGuard PRO', status: 'ACTIVE' }]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'pro',
      );
    });

    it('picks the highest tier when multiple subscriptions are active', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([
        { name: 'Pro Plan', status: 'ACTIVE' },
        { name: 'Enterprise Plan', status: 'ACTIVE' },
      ]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'enterprise',
      );
    });

    it('returns "free" for an unrecognized active plan name (fail closed)', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([{ name: 'Mystery Plan', status: 'ACTIVE' }]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('returns "free" when the shop is not in the database (fail closed)', async() => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
      expect(mockCreateGraphQLClient).not.toHaveBeenCalled();
    });

    it('returns "free" when the database lookup fails (fail closed)', async() => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('returns "free" when the Shopify GraphQL query fails (fail closed)', async() => {
      mockShopTokenLookup();
      mockCreateGraphQLClient.mockResolvedValue({
        query: jest
          .fn()
          .mockRejectedValue(new Error('GraphQL error: throttled')),
      });

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('returns "free" when the GraphQL response has no installation data (fail closed)', async() => {
      mockShopTokenLookup();
      mockCreateGraphQLClient.mockResolvedValue({
        query: jest.fn().mockResolvedValue({ data: undefined }),
      });

      await expect(billingService.getCurrentPlan(testShop)).resolves.toBe(
        'free',
      );
    });

    it('never touches a local subscriptions table', async() => {
      mockShopTokenLookup();
      mockActiveSubscriptions([{ name: 'Pro Plan', status: 'ACTIVE' }]);

      await billingService.getCurrentPlan(testShop);

      for (const call of mockQuery.mock.calls) {
        expect(String(call[0])).not.toMatch(/subscriptions/i);
      }
    });
  });

  describe('meetsPlan', () => {
    it.each([
      ['free', 'free', true],
      ['free', 'pro', false],
      ['free', 'enterprise', false],
      ['pro', 'free', true],
      ['pro', 'pro', true],
      ['pro', 'enterprise', false],
      ['enterprise', 'pro', true],
      ['enterprise', 'enterprise', true],
    ] as const)('meetsPlan(%s, %s) === %s', (tier, required, expected) => {
      expect(billingService.meetsPlan(tier, required)).toBe(expected);
    });
  });

  describe('isSmsAllowed', () => {
    it('denies SMS on the free tier', () => {
      expect(billingService.isSmsAllowed('free')).toBe(false);
    });

    it('allows SMS on pro and enterprise tiers', () => {
      expect(billingService.isSmsAllowed('pro')).toBe(true);
      expect(billingService.isSmsAllowed('enterprise')).toBe(true);
    });
  });
});
