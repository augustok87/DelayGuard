/**
 * Billing Service
 * Handles Shopify Billing API integration and subscription management
 *
 * Supports:
 * - Free tier (50 alerts/month)
 * - Pro tier ($7/month, unlimited alerts, 14-day trial)
 * - Enterprise tier ($25/month, white-label + API, 14-day trial)
 */

import { query } from "../database/connection";
import { logger } from "../utils/logger";
import type {
  AppSubscription,
  BillingConfig,
  RecurringCharge,
  ShopifySubscriptionPlan,
} from "../types";

export class BillingService {
  private readonly billingConfig: BillingConfig = {
    plans: {
      free: {
        name: "Free Plan",
        price: 0,
        trial_days: 0,
        features: [
          "50 delay alerts per month",
          "Email notifications",
          "Basic analytics",
          "Email support",
        ],
        monthly_alert_limit: 50,
      },
      pro: {
        name: "Pro Plan",
        price: 7,
        trial_days: 14,
        features: [
          "Unlimited delay alerts",
          "Email and SMS notifications",
          "Advanced analytics",
          "Custom templates",
          "Priority email support",
        ],
      },
      enterprise: {
        name: "Enterprise Plan",
        price: 25,
        trial_days: 14,
        features: [
          "Unlimited delay alerts",
          "Email and SMS notifications",
          "Advanced analytics with custom reports",
          "White-label notifications",
          "API access",
          "Custom integrations",
          "Dedicated account manager",
          "24/7 phone support",
        ],
      },
    },
  };

  /**
   * Get plan configuration by name
   */
  getPlanConfig(
    planName: "free" | "pro" | "enterprise",
  ): ShopifySubscriptionPlan {
    const plan = this.billingConfig.plans[planName];
    if (!plan) {
      throw new Error(`Invalid plan name: ${planName}`);
    }
    return plan;
  }

  /**
   * Get current subscription for a shop
   */
  async getSubscription(shopId: string): Promise<AppSubscription | null> {
    try {
      const result = await query<AppSubscription>(
        "SELECT * FROM subscriptions WHERE shop_id = $1 AND status != $2",
        [shopId, "cancelled"],
      );

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error("Error fetching subscription", error as Error);
      throw error;
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(
    shopId: string,
    planName: "free" | "pro" | "enterprise",
    shopifyChargeId?: string,
  ): Promise<AppSubscription> {
    try {
      const plan = this.getPlanConfig(planName);
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      let trialEndsAt: Date | undefined;
      if (plan.trial_days > 0) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + plan.trial_days);
      }

      const result = await query<AppSubscription>(
        `INSERT INTO subscriptions (
          shop_id,
          plan_name,
          status,
          current_period_start,
          current_period_end,
          trial_ends_at,
          shopify_charge_id,
          monthly_alert_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          shopId,
          planName,
          "active",
          now,
          periodEnd,
          trialEndsAt || null,
          shopifyChargeId || null,
          0,
        ],
      );

      logger.info("Subscription created successfully", {
        shop_id: shopId,
        plan_name: planName,
        trial_ends_at: trialEndsAt,
      });

      return result[0];
    } catch (error) {
      logger.error("Error creating subscription", error as Error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<AppSubscription>,
  ): Promise<AppSubscription> {
    try {
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== "id" && key !== "shop_id" && key !== "created_at") {
          updateFields.push(`${key} = $${paramIndex}`);
          updateValues.push(value);
          paramIndex++;
        }
      });

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(subscriptionId);

      const result = await query<AppSubscription>(
        `UPDATE subscriptions 
         SET ${updateFields.join(", ")}
         WHERE id = $${paramIndex}
         RETURNING *`,
        updateValues,
      );

      logger.info("Subscription updated successfully", {
        subscription_id: subscriptionId,
        updates: Object.keys(updates),
      });

      return result[0];
    } catch (error) {
      logger.error("Error updating subscription", error as Error);
      throw error;
    }
  }

  /**
   * Increment monthly alert count
   */
  async incrementAlertCount(subscriptionId: string): Promise<void> {
    try {
      await query(
        `UPDATE subscriptions 
         SET monthly_alert_count = monthly_alert_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [subscriptionId],
      );
    } catch (error) {
      logger.error("Error incrementing alert count", error as Error);
      throw error;
    }
  }

  /**
   * Check if shop has reached alert limit
   */
  async checkAlertLimit(shopId: string): Promise<{
    allowed: boolean;
    current_count: number;
    limit?: number;
    plan_name: string;
    upgrade_required?: boolean;
    error?: string;
  }> {
    try {
      const subscription = await this.getSubscription(shopId);

      if (!subscription) {
        return {
          allowed: false,
          current_count: 0,
          limit: 0,
          plan_name: "none",
          error: "No active subscription found",
        };
      }

      const plan = this.getPlanConfig(subscription.plan_name);
      const limit = plan.monthly_alert_limit;

      // Unlimited plans (pro, enterprise)
      if (!limit) {
        return {
          allowed: true,
          current_count: subscription.monthly_alert_count,
          limit: undefined,
          plan_name: subscription.plan_name,
        };
      }

      // Free plan with limit
      const allowed = subscription.monthly_alert_count < limit;
      const upgradeRequired = !allowed;

      return {
        allowed,
        current_count: subscription.monthly_alert_count,
        limit,
        plan_name: subscription.plan_name,
        upgrade_required: upgradeRequired,
      };
    } catch (error) {
      logger.error("Error checking alert limit", error as Error);
      throw error;
    }
  }

  /**
   * Generate Shopify recurring charge object
   */
  generateRecurringCharge(
    planName: "free" | "pro" | "enterprise",
    returnUrl: string,
    test: boolean = false,
  ): RecurringCharge {
    const plan = this.getPlanConfig(planName);

    if (plan.price === 0) {
      throw new Error("Cannot create charge for free plan");
    }

    return {
      name: plan.name,
      price: plan.price.toFixed(2),
      return_url: returnUrl,
      trial_days: plan.trial_days,
      test,
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(shopId: string): Promise<AppSubscription> {
    try {
      const result = await query<AppSubscription>(
        `UPDATE subscriptions 
         SET status = $1,
             cancelled_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE shop_id = $2 AND status = $3
         RETURNING *`,
        ["cancelled", shopId, "active"],
      );

      logger.info("Subscription cancelled successfully", {
        shop_id: shopId,
      });

      return result[0];
    } catch (error) {
      logger.error("Error cancelling subscription", error as Error);
      throw error;
    }
  }

  /**
   * Reset monthly alert counter (called at billing period start)
   */
  async resetMonthlyAlertCount(subscriptionId: string): Promise<void> {
    try {
      await query(
        `UPDATE subscriptions 
         SET monthly_alert_count = 0,
             current_period_start = CURRENT_TIMESTAMP,
             current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [subscriptionId],
      );

      logger.info("Monthly alert count reset", {
        subscription_id: subscriptionId,
      });
    } catch (error) {
      logger.error("Error resetting monthly alert count", error as Error);
      throw error;
    }
  }

  /**
   * Check if subscription is in trial period
   */
  isInTrial(subscription: AppSubscription): boolean {
    if (!subscription.trial_ends_at) {
      return false;
    }

    return new Date() < new Date(subscription.trial_ends_at);
  }

  /**
   * Get billing summary for shop
   */
  async getBillingSummary(shopId: string): Promise<{
    subscription: AppSubscription | null;
    plan_config: ShopifySubscriptionPlan | null;
    in_trial: boolean;
    usage: {
      current_count: number;
      limit?: number;
      percentage?: number;
    };
    billing_status: "active" | "trial" | "cancelled" | "none";
  }> {
    try {
      const subscription = await this.getSubscription(shopId);

      if (!subscription) {
        return {
          subscription: null,
          plan_config: null,
          in_trial: false,
          usage: {
            current_count: 0,
            limit: 0,
          },
          billing_status: "none",
        };
      }

      const planConfig = this.getPlanConfig(subscription.plan_name);
      const inTrial = this.isInTrial(subscription);

      let billingStatus: "active" | "trial" | "cancelled" | "none" = "active";
      if (subscription.status === "cancelled") {
        billingStatus = "cancelled";
      } else if (inTrial) {
        billingStatus = "trial";
      }

      const usage: {
        current_count: number;
        limit?: number;
        percentage?: number;
      } = {
        current_count: subscription.monthly_alert_count,
        limit: planConfig.monthly_alert_limit,
      };

      if (usage.limit) {
        usage.percentage = Math.round(
          (usage.current_count / usage.limit) * 100,
        );
      }

      return {
        subscription,
        plan_config: planConfig,
        in_trial: inTrial,
        usage,
        billing_status: billingStatus,
      };
    } catch (error) {
      logger.error("Error getting billing summary", error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const billingService = new BillingService();
