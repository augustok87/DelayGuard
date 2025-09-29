# DelayGuard - Billing & Subscription Configuration

## 🎯 **Complete Billing System Setup**

### **Pricing Strategy**

#### **Free Plan - $0/month**
```
Features:
- Up to 100 orders/month
- Basic delay detection
- Email notifications only
- Standard templates
- Basic analytics
- Community support
- 14-day trial of Pro features

Target: Small stores, testing, evaluation
```

#### **Pro Plan - $29/month**
```
Features:
- Up to 1,000 orders/month
- Advanced delay detection
- Email + SMS notifications
- Custom templates
- Advanced analytics
- Priority support
- API access
- Custom webhooks

Target: Growing businesses, established stores
```

#### **Enterprise Plan - $99/month**
```
Features:
- Unlimited orders
- All Pro features
- Custom integrations
- Dedicated support
- SLA guarantee
- Custom reporting
- White-label options
- On-premise deployment

Target: Large enterprises, high-volume stores
```

---

## 💳 **Billing Implementation**

### **Shopify Billing API Integration**

#### **Required Scopes**
```
Billing Scopes:
- write_application_charges: Create one-time charges
- write_recurring_application_charges: Create recurring charges
- read_application_charges: Read charge information
- read_recurring_application_charges: Read recurring charge information
```

#### **Billing Endpoints**
```javascript
// Create recurring charge
POST /admin/api/2023-10/recurring_application_charges.json
{
  "recurring_application_charge": {
    "name": "DelayGuard Pro Plan",
    "price": "29.00",
    "return_url": "https://delayguard-api.vercel.app/billing/return",
    "trial_days": 14,
    "test": false
  }
}

// Create one-time charge
POST /admin/api/2023-10/application_charges.json
{
  "application_charge": {
    "name": "DelayGuard Setup Fee",
    "price": "99.00",
    "return_url": "https://delayguard-api.vercel.app/billing/return",
    "test": false
  }
}
```

### **Billing Webhook Implementation**

#### **Webhook Endpoints**
```javascript
// Billing webhook handler
app.post('/api/billing', async (ctx) => {
  const { topic, data } = ctx.request.body;
  
  switch (topic) {
    case 'app_subscription/created':
      await handleSubscriptionCreated(data);
      break;
    case 'app_subscription/updated':
      await handleSubscriptionUpdated(data);
      break;
    case 'app_subscription/cancelled':
      await handleSubscriptionCancelled(data);
      break;
    case 'app_subscription/expired':
      await handleSubscriptionExpired(data);
      break;
    case 'app_subscription/payment_failed':
      await handlePaymentFailed(data);
      break;
  }
  
  ctx.status = 200;
});
```

#### **Subscription Management**
```javascript
// Subscription status tracking
const subscriptionStatus = {
  ACTIVE: 'active',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended'
};

// Plan limits
const planLimits = {
  FREE: {
    ordersPerMonth: 100,
    features: ['basic_detection', 'email_notifications', 'basic_analytics']
  },
  PRO: {
    ordersPerMonth: 1000,
    features: ['advanced_detection', 'email_notifications', 'sms_notifications', 'advanced_analytics', 'api_access']
  },
  ENTERPRISE: {
    ordersPerMonth: -1, // unlimited
    features: ['all_features', 'custom_integrations', 'dedicated_support', 'sla_guarantee']
  }
};
```

---

## 🔧 **Billing Service Implementation**

### **Billing Service Class**
```javascript
class BillingService {
  constructor(shopifyClient) {
    this.shopify = shopifyClient;
  }
  
  async createSubscription(shop, planId) {
    const plan = this.getPlan(planId);
    
    const charge = await this.shopify.recurringApplicationCharge.create({
      name: plan.name,
      price: plan.price,
      return_url: `${process.env.APP_URL}/billing/return?shop=${shop}`,
      trial_days: plan.trialDays,
      test: process.env.NODE_ENV !== 'production'
    });
    
    return charge;
  }
  
  async getSubscription(shop) {
    const charges = await this.shopify.recurringApplicationCharge.list();
    return charges.find(charge => charge.status === 'active');
  }
  
  async cancelSubscription(shop, chargeId) {
    const charge = await this.shopify.recurringApplicationCharge.get(chargeId);
    return await charge.destroy();
  }
  
  async checkUsage(shop, currentMonth) {
    const subscription = await this.getSubscription(shop);
    const plan = this.getPlan(subscription.planId);
    
    const usage = await this.getMonthlyUsage(shop, currentMonth);
    
    return {
      plan: plan,
      usage: usage,
      limit: plan.ordersPerMonth,
      exceeded: plan.ordersPerMonth > 0 && usage >= plan.ordersPerMonth
    };
  }
  
  getPlan(planId) {
    const plans = {
      'free': {
        id: 'free',
        name: 'DelayGuard Free',
        price: '0.00',
        trialDays: 0,
        ordersPerMonth: 100,
        features: ['basic_detection', 'email_notifications']
      },
      'pro': {
        id: 'pro',
        name: 'DelayGuard Pro',
        price: '29.00',
        trialDays: 14,
        ordersPerMonth: 1000,
        features: ['advanced_detection', 'email_notifications', 'sms_notifications', 'advanced_analytics']
      },
      'enterprise': {
        id: 'enterprise',
        name: 'DelayGuard Enterprise',
        price: '99.00',
        trialDays: 14,
        ordersPerMonth: -1,
        features: ['all_features', 'custom_integrations', 'dedicated_support']
      }
    };
    
    return plans[planId] || plans['free'];
  }
}
```

### **Usage Tracking**
```javascript
class UsageTracker {
  async trackOrder(shop, orderId) {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const key = `usage:${shop}:${currentMonth}`;
    
    await redis.incr(key);
    await redis.expire(key, 2678400); // 31 days
    
    // Check if usage exceeded limit
    const usage = await redis.get(key);
    const subscription = await billingService.getSubscription(shop);
    const plan = billingService.getPlan(subscription.planId);
    
    if (plan.ordersPerMonth > 0 && usage >= plan.ordersPerMonth) {
      await this.handleUsageExceeded(shop, usage, plan.ordersPerMonth);
    }
  }
  
  async getMonthlyUsage(shop, month) {
    const key = `usage:${shop}:${month}`;
    const usage = await redis.get(key);
    return parseInt(usage) || 0;
  }
  
  async handleUsageExceeded(shop, usage, limit) {
    // Send notification to merchant
    await notificationService.sendUsageExceededAlert(shop, usage, limit);
    
    // Log the event
    await this.logUsageEvent(shop, 'usage_exceeded', { usage, limit });
  }
}
```

---

## 📊 **Billing Dashboard**

### **Billing Dashboard Component**
```javascript
const BillingDashboard = () => {
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadBillingData();
  }, []);
  
  const loadBillingData = async () => {
    try {
      const [subRes, usageRes] = await Promise.all([
        fetch('/api/billing/subscription').then(res => res.json()),
        fetch('/api/billing/usage').then(res => res.json())
      ]);
      
      setSubscription(subRes);
      setUsage(usageRes);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const upgradePlan = async (planId) => {
    try {
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      
      const { chargeUrl } = await response.json();
      window.location.href = chargeUrl;
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
    }
  };
  
  if (loading) return <Spinner />;
  
  return (
    <Page title="Billing & Subscription">
      <Layout>
        <Layout.Section>
          <Card title="Current Plan" sectioned>
            <Stack vertical>
              <DisplayText size="medium">{subscription?.plan?.name}</DisplayText>
              <TextStyle variation="subdued">
                ${subscription?.plan?.price}/month
              </TextStyle>
              {subscription?.trialDays > 0 && (
                <Banner status="info">
                  Trial ends in {subscription.trialDays} days
                </Banner>
              )}
            </Stack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card title="Usage This Month" sectioned>
            <Stack vertical>
              <DisplayText size="medium">
                {usage?.current} / {usage?.limit === -1 ? 'Unlimited' : usage?.limit} orders
              </DisplayText>
              {usage?.limit > 0 && (
                <ProgressBar progress={(usage.current / usage.limit) * 100} />
              )}
              {usage?.exceeded && (
                <Banner status="warning">
                  Usage limit exceeded. Upgrade to continue.
                </Banner>
              )}
            </Stack>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card title="Available Plans" sectioned>
            <Stack distribution="fill">
              {plans.map(plan => (
                <Card key={plan.id} sectioned>
                  <Stack vertical>
                    <TextStyle variation="strong">{plan.name}</TextStyle>
                    <DisplayText size="medium">${plan.price}/month</DisplayText>
                    <TextStyle variation="subdued">
                      {plan.ordersPerMonth === -1 ? 'Unlimited' : plan.ordersPerMonth} orders/month
                    </TextStyle>
                    <Button
                      primary={plan.id === 'pro'}
                      onClick={() => upgradePlan(plan.id)}
                    >
                      {plan.id === subscription?.plan?.id ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};
```

---

## 🚨 **Billing Error Handling**

### **Payment Failure Handling**
```javascript
const handlePaymentFailed = async (data) => {
  const { shop, charge } = data;
  
  // Send notification to merchant
  await notificationService.sendPaymentFailedAlert(shop, charge);
  
  // Log the event
  await logger.logBillingEvent(shop, 'payment_failed', { charge });
  
  // Suspend app functionality if needed
  await appService.suspendApp(shop, 'payment_failed');
};

const handleSubscriptionExpired = async (data) => {
  const { shop, charge } = data;
  
  // Send notification to merchant
  await notificationService.sendSubscriptionExpiredAlert(shop, charge);
  
  // Log the event
  await logger.logBillingEvent(shop, 'subscription_expired', { charge });
  
  // Suspend app functionality
  await appService.suspendApp(shop, 'subscription_expired');
};
```

### **Usage Exceeded Handling**
```javascript
const handleUsageExceeded = async (shop, usage, limit) => {
  // Send notification to merchant
  await notificationService.sendUsageExceededAlert(shop, usage, limit);
  
  // Log the event
  await logger.logBillingEvent(shop, 'usage_exceeded', { usage, limit });
  
  // Suspend app functionality
  await appService.suspendApp(shop, 'usage_exceeded');
};
```

---

## 📈 **Billing Analytics**

### **Revenue Tracking**
```javascript
class BillingAnalytics {
  async getRevenueMetrics(period = 'month') {
    const subscriptions = await this.getActiveSubscriptions();
    
    const revenue = subscriptions.reduce((total, sub) => {
      return total + parseFloat(sub.plan.price);
    }, 0);
    
    const metrics = {
      totalRevenue: revenue,
      activeSubscriptions: subscriptions.length,
      averageRevenuePerUser: revenue / subscriptions.length,
      churnRate: await this.calculateChurnRate(period),
      conversionRate: await this.calculateConversionRate(period)
    };
    
    return metrics;
  }
  
  async calculateChurnRate(period) {
    const startDate = this.getPeriodStart(period);
    const endDate = this.getPeriodEnd(period);
    
    const cancelled = await this.getCancelledSubscriptions(startDate, endDate);
    const total = await this.getTotalSubscriptions(startDate, endDate);
    
    return (cancelled / total) * 100;
  }
  
  async calculateConversionRate(period) {
    const startDate = this.getPeriodStart(period);
    const endDate = this.getPeriodEnd(period);
    
    const trials = await this.getTrialSubscriptions(startDate, endDate);
    const conversions = await this.getConvertedSubscriptions(startDate, endDate);
    
    return (conversions / trials) * 100;
  }
}
```

---

## 🔒 **Security & Compliance**

### **Billing Security**
```javascript
// Validate webhook signatures
const validateBillingWebhook = (body, signature, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body, 'utf8');
  const hash = hmac.digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(hash, 'base64')
  );
};

// Secure billing data storage
const encryptBillingData = (data) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.BILLING_SECRET);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};
```

### **PCI Compliance**
- **No Card Data Storage**: Never store credit card information
- **Shopify Billing**: Use Shopify's secure billing system
- **Encrypted Storage**: Encrypt all billing-related data
- **Audit Logging**: Log all billing events for compliance

---

## 📞 **Support & Documentation**

### **Billing Support**
```javascript
const BillingSupport = {
  async getBillingHelp(shop) {
    const subscription = await billingService.getSubscription(shop);
    const usage = await usageTracker.getMonthlyUsage(shop);
    
    return {
      subscription,
      usage,
      helpArticles: [
        'How to upgrade your plan',
        'Understanding usage limits',
        'Billing and payment FAQ',
        'How to cancel your subscription'
      ],
      contactSupport: 'support@delayguard.app'
    };
  }
};
```

### **Billing Documentation**
- **Pricing Page**: Clear pricing and feature comparison
- **FAQ**: Common billing questions and answers
- **Support**: Dedicated billing support channel
- **Terms**: Clear terms of service and billing policies

---

*This comprehensive billing system ensures DelayGuard can monetize effectively while providing excellent customer experience and compliance with Shopify's billing requirements.*
