-- Migration: Create subscriptions table
-- Description: Add subscription management for Shopify billing
-- Version: 003
-- Date: 2025-10-21

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  plan_name VARCHAR(50) NOT NULL CHECK (plan_name IN ('free', 'pro', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'cancelled', 'frozen', 'pending')),
  current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP NOT NULL,
  trial_ends_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  shopify_charge_id VARCHAR(255),
  monthly_alert_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_subscriptions_shop_id ON subscriptions(shop_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_name ON subscriptions(plan_name);
CREATE INDEX idx_subscriptions_charge_id ON subscriptions(shopify_charge_id);

-- Create unique constraint to prevent multiple active subscriptions per shop
CREATE UNIQUE INDEX idx_subscriptions_active_shop 
  ON subscriptions(shop_id) 
  WHERE status IN ('active', 'pending');

-- Add comments
COMMENT ON TABLE subscriptions IS 'Stores Shopify app subscription information';
COMMENT ON COLUMN subscriptions.id IS 'Unique identifier for the subscription';
COMMENT ON COLUMN subscriptions.shop_id IS 'Reference to the shop';
COMMENT ON COLUMN subscriptions.plan_name IS 'Subscription plan: free, pro, or enterprise';
COMMENT ON COLUMN subscriptions.status IS 'Current subscription status';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When the trial period ends (if applicable)';
COMMENT ON COLUMN subscriptions.cancelled_at IS 'When the subscription was cancelled';
COMMENT ON COLUMN subscriptions.shopify_charge_id IS 'Shopify RecurringApplicationCharge ID';
COMMENT ON COLUMN subscriptions.monthly_alert_count IS 'Number of alerts sent in current period';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_subscription_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

