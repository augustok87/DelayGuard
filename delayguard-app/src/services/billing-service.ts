/**
 * Billing Service — Shopify App Pricing plan gate (LAUNCH_PLAN WS-F F1)
 *
 * DelayGuard uses Shopify App Pricing (rebranded Managed Pricing, 2026-05):
 * plans are configured in the Partner Dashboard, Shopify hosts the plan
 * selection page and runs the entire charge lifecycle. The app therefore
 * contains ZERO charge-creation code. This service is a thin read-only gate:
 *
 *   - `getCurrentPlan(shopDomain)` resolves the shop's tier from the Admin
 *     GraphQL API (`currentAppInstallation.activeSubscriptions`).
 *   - `meetsPlan` / `isSmsAllowed` gate paid features (SMS is Pro+).
 *
 * ⚠️ SMS is gated in CODE but deliberately absent from the advertised plan
 * features (LAUNCH_PLAN decision D3 + §6 R20): the Twilio account is a trial
 * that owns no phone number, so no SMS can currently be delivered, and
 * advertising a paid feature the app cannot perform is a rejection risk.
 * `billing-plan-claims.test.ts` holds that line; delete it when SMS is real.
 *
 * FAIL-CLOSED CONTRACT: any failure (shop missing, DB error, Shopify API
 * error, unrecognized plan name) resolves to the free tier. Never throw a
 * merchant into a paid tier on ambiguity.
 *
 * Tiers (LAUNCH_PLAN decision D1): Free $0 / Pro $7 / Enterprise $25.
 */

import { query } from "../database/connection";
import { logger } from "../utils/logger";
import { createGraphQLClient } from "./shopify-service";
import type { BillingConfig, ShopifySubscriptionPlan } from "../types";

export type PlanTier = "free" | "pro" | "enterprise";

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

/**
 * Admin GraphQL query for the shop's active App Pricing subscriptions.
 * `name` matches the plan name configured in the Partner Dashboard;
 * `status` is an AppSubscriptionStatus (only ACTIVE counts here).
 */
const ACTIVE_SUBSCRIPTIONS_QUERY = `
  query CurrentPlan {
    currentAppInstallation {
      activeSubscriptions {
        name
        status
      }
    }
  }
`;

interface ActiveSubscriptionsResponse {
  currentAppInstallation?: {
    activeSubscriptions?: Array<{ name: string; status: string }>;
  };
}

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
          "Email notifications",
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
          "Email notifications",
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
   * Get plan configuration by tier.
   */
  getPlanConfig(planName: PlanTier): ShopifySubscriptionPlan {
    const plan = this.billingConfig.plans[planName];
    if (!plan) {
      throw new Error(`Invalid plan name: ${planName}`);
    }
    return plan;
  }

  /**
   * Resolve the shop's current plan tier from Shopify.
   *
   * Fails closed: any error path (missing shop, DB failure, GraphQL failure,
   * unrecognized plan name, non-ACTIVE subscription) returns "free".
   */
  async getCurrentPlan(shopDomain: string): Promise<PlanTier> {
    try {
      const shopRows = await query<{ access_token: string }>(
        "SELECT access_token FROM shops WHERE shop_domain = $1",
        [shopDomain],
      );

      if (shopRows.length === 0 || !shopRows[0].access_token) {
        logger.warn("Plan lookup: shop not found — failing closed to free", {
          shop: shopDomain,
        });
        return "free";
      }

      const client = await createGraphQLClient(
        shopDomain,
        shopRows[0].access_token,
      );
      const response = await client.query<ActiveSubscriptionsResponse>(
        ACTIVE_SUBSCRIPTIONS_QUERY,
      );

      const subscriptions =
        response.data?.currentAppInstallation?.activeSubscriptions ?? [];

      let tier: PlanTier = "free";
      for (const subscription of subscriptions) {
        if (subscription.status !== "ACTIVE") continue;
        const mapped = mapSubscriptionNameToTier(subscription.name);
        if (mapped === null) {
          logger.warn(
            "Plan lookup: unrecognized active subscription name — ignoring",
            { shop: shopDomain, subscriptionName: subscription.name },
          );
          continue;
        }
        if (PLAN_RANK[mapped] > PLAN_RANK[tier]) {
          tier = mapped;
        }
      }

      return tier;
    } catch (error) {
      logger.warn("Plan lookup failed — failing closed to free tier", {
        shop: shopDomain,
        error: error instanceof Error ? error.message : String(error),
      });
      return "free";
    }
  }

  /**
   * True when `tier` is at least `required` (free < pro < enterprise).
   */
  meetsPlan(tier: PlanTier, required: PlanTier): boolean {
    return PLAN_RANK[tier] >= PLAN_RANK[required];
  }

  /**
   * SMS notifications are a paid feature (Pro and above).
   */
  isSmsAllowed(tier: PlanTier): boolean {
    return this.meetsPlan(tier, "pro");
  }
}

/**
 * Map a Partner-Dashboard plan name to a tier. Matching is substring +
 * case-insensitive ("Pro Plan", "DelayGuard PRO", …). Unrecognized names
 * return null so the caller can fail closed.
 */
function mapSubscriptionNameToTier(name: string): PlanTier | null {
  const normalized = name.toLowerCase();
  if (normalized.includes("enterprise")) return "enterprise";
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("free")) return "free";
  return null;
}

// Export singleton instance
export const billingService = new BillingService();
