/**
 * Billing Service Tests
 * Tests for Shopify Billing API integration
 */

import { BillingService } from '../../../services/billing-service';
import { query } from '../../../database/connection';
import { logger } from '../../../utils/logger';
import type { AppSubscription } from '../../../types';

// Mock dependencies
jest.mock('../../../database/connection');
jest.mock('../../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
    jest.clearAllMocks();
  });

  describe('getPlanConfig', () => {
    it('should return free plan configuration', () => {
      const plan = billingService.getPlanConfig('free');

      expect(plan).toEqual({
        name: 'Free Plan',
        price: 0,
        trial_days: 0,
        features: [
          '50 delay alerts per month',
          'Email notifications',
          'Basic analytics',
          'Email support',
        ],
        monthly_alert_limit: 50,
      });
    });

    it('should return pro plan configuration', () => {
      const plan = billingService.getPlanConfig('pro');

      expect(plan).toEqual({
        name: 'Pro Plan',
        price: 7,
        trial_days: 14,
        features: [
          'Unlimited delay alerts',
          'Email and SMS notifications',
          'Advanced analytics',
          'Custom templates',
          'Priority email support',
        ],
        monthly_alert_limit: undefined,
      });
    });

    it('should return enterprise plan configuration', () => {
      const plan = billingService.getPlanConfig('enterprise');

      expect(plan).toEqual({
        name: 'Enterprise Plan',
        price: 25,
        trial_days: 14,
        features: [
          'Unlimited delay alerts',
          'Email and SMS notifications',
          'Advanced analytics with custom reports',
          'White-label notifications',
          'API access',
          'Custom integrations',
          'Dedicated account manager',
          '24/7 phone support',
        ],
        monthly_alert_limit: undefined,
      });
    });

    it('should throw error for invalid plan', () => {
      expect(() => {
        billingService.getPlanConfig('invalid' as 'free');
      }).toThrow('Invalid plan name: invalid');
    });
  });

  describe('getSubscription', () => {
    it('should retrieve active subscription', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'pro',
        status: 'active',
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-02-01'),
        trial_ends_at: new Date('2024-01-15'),
        shopify_charge_id: 'charge-123',
        monthly_alert_count: 15,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.getSubscription('shop-uuid');

      expect(result).toEqual(mockSubscription);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM subscriptions'),
        ['shop-uuid', 'cancelled']
      );
    });

    it('should return null if no subscription found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await billingService.getSubscription('shop-uuid');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        billingService.getSubscription('shop-uuid')
      ).rejects.toThrow('Database error');
    });
  });

  describe('createSubscription', () => {
    it('should create free subscription successfully', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-new',
        shop_id: 'shop-uuid',
        plan_name: 'free',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        monthly_alert_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.createSubscription(
        'shop-uuid',
        'free'
      );

      expect(result).toEqual(mockSubscription);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO subscriptions'),
        expect.arrayContaining(['shop-uuid', 'free', 'active'])
      );
    });

    it('should create pro subscription with trial', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-new',
        shop_id: 'shop-uuid',
        plan_name: 'pro',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        monthly_alert_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.createSubscription(
        'shop-uuid',
        'pro',
        'charge-123'
      );

      expect(result.plan_name).toBe('pro');
      expect(result.trial_ends_at).toBeDefined();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription status', async () => {
      const mockUpdatedSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'pro',
        status: 'cancelled',
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-02-01'),
        cancelled_at: new Date(),
        monthly_alert_count: 15,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockUpdatedSubscription]);

      const result = await billingService.updateSubscription('sub-123', {
        status: 'cancelled',
        cancelled_at: new Date(),
      });

      expect(result.status).toBe('cancelled');
      expect(result.cancelled_at).toBeDefined();
    });

    it('should increment alert count', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'free',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        monthly_alert_count: 10,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      await billingService.incrementAlertCount('sub-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE subscriptions'),
        expect.arrayContaining(['sub-123'])
      );
    });
  });

  describe('checkAlertLimit', () => {
    it('should allow alerts within free plan limit', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'free',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        monthly_alert_count: 30,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.checkAlertLimit('shop-uuid');

      expect(result).toEqual({
        allowed: true,
        current_count: 30,
        limit: 50,
        plan_name: 'free',
        upgrade_required: false,
      });
    });

    it('should block alerts exceeding free plan limit', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'free',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        monthly_alert_count: 50,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.checkAlertLimit('shop-uuid');

      expect(result).toEqual({
        allowed: false,
        current_count: 50,
        limit: 50,
        plan_name: 'free',
        upgrade_required: true,
      });
    });

    it('should always allow alerts for pro plan', async () => {
      const mockSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'pro',
        status: 'active',
        current_period_start: new Date(),
        current_period_end: new Date(),
        monthly_alert_count: 1000,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockSubscription]);

      const result = await billingService.checkAlertLimit('shop-uuid');

      expect(result).toEqual({
        allowed: true,
        current_count: 1000,
        limit: undefined,
        plan_name: 'pro',
      });
    });

    it('should handle subscription not found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await billingService.checkAlertLimit('shop-uuid');

      expect(result).toEqual({
        allowed: false,
        current_count: 0,
        limit: 0,
        plan_name: 'none',
        error: 'No active subscription found',
      });
    });
  });

  describe('generateRecurringCharge', () => {
    it('should generate charge for pro plan', () => {
      const charge = billingService.generateRecurringCharge(
        'pro',
        'https://example.com/billing/callback',
        false
      );

      expect(charge).toEqual({
        name: 'Pro Plan',
        price: '7.00',
        return_url: 'https://example.com/billing/callback',
        trial_days: 14,
        test: false,
      });
    });

    it('should generate test charge for development', () => {
      const charge = billingService.generateRecurringCharge(
        'enterprise',
        'https://example.com/billing/callback',
        true
      );

      expect(charge).toEqual({
        name: 'Enterprise Plan',
        price: '25.00',
        return_url: 'https://example.com/billing/callback',
        trial_days: 14,
        test: true,
      });
    });

    it('should throw error for free plan charge', () => {
      expect(() => {
        billingService.generateRecurringCharge(
          'free',
          'https://example.com/billing/callback'
        );
      }).toThrow('Cannot create charge for free plan');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const mockCancelledSubscription: AppSubscription = {
        id: 'sub-123',
        shop_id: 'shop-uuid',
        plan_name: 'pro',
        status: 'cancelled',
        current_period_start: new Date('2024-01-01'),
        current_period_end: new Date('2024-02-01'),
        cancelled_at: new Date(),
        monthly_alert_count: 15,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce([mockCancelledSubscription]);

      const result = await billingService.cancelSubscription('shop-uuid');

      expect(result.status).toBe('cancelled');
      expect(result.cancelled_at).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Subscription cancelled'),
        expect.any(Object)
      );
    });
  });
});

