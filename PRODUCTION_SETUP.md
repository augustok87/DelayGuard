# DelayGuard Production Environment Setup Guide

**Last Updated**: October 23, 2025  
**Version**: 1.1.0  
**Status**: ✅ **Environment Variables Configured in Vercel** (14/14 complete)

This guide provides step-by-step instructions for configuring DelayGuard for production deployment.

> **✅ UPDATE (Oct 23, 2025)**: All 14 required environment variables have been successfully configured in Vercel. See Section 6 for complete details.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Shopify App Configuration](#shopify-app-configuration)
3. [Database Setup](#database-setup)
4. [Redis Setup](#redis-setup)
5. [External API Keys](#external-api-keys)
6. [Vercel Deployment](#vercel-deployment)
7. [Environment Variables](#environment-variables)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up production, ensure you have:

- ✅ Shopify Partner account
- ✅ Shopify test/development store
- ✅ Vercel account (for hosting)
- ✅ PostgreSQL database (Neon, Supabase, or similar)
- ✅ Redis instance (Upstash recommended)
- ✅ Domain name (optional but recommended)
- ✅ Email for support contact
- ✅ Credit card for paid service tiers (if needed)

---

## 1. Shopify App Configuration

### Step 1.1: Create Shopify App

1. Go to [Shopify Partners Dashboard](https://partners.shopify.com)
2. Navigate to **Apps** → **Create app**
3. Choose **Create app manually**
4. Fill in app details:
   - **App name**: DelayGuard
   - **App URL**: `https://your-app.vercel.app`
   - **Allowed redirection URL(s)**: 
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/billing/callback`

### Step 1.2: Configure App Settings

1. **App setup** → **Configuration**:
   - Embedded: **Yes** (App is embedded in Shopify admin)
   - Home page: `https://your-app.vercel.app`

2. **API access scopes** (required permissions):
   ```
   read_orders
   write_orders
   read_fulfillments
   write_fulfillments
   read_products
   read_customers
   ```

3. **Webhooks** (configure all required webhooks):
   - `orders/updated` → `https://your-app.vercel.app/webhooks/orders/updated`
   - `fulfillments/updated` → `https://your-app.vercel.app/webhooks/fulfillments/updated`
   - `orders/paid` → `https://your-app.vercel.app/webhooks/orders/paid`
   - **GDPR webhooks (MANDATORY)**:
     - `customers/data_request` → `https://your-app.vercel.app/webhooks/gdpr/customers/data_request`
     - `customers/redact` → `https://your-app.vercel.app/webhooks/gdpr/customers/redact`
     - `shop/redact` → `https://your-app.vercel.app/webhooks/gdpr/shop/redact`

4. **Copy credentials**:
   - API key
   - API secret key
   - (Save these for environment variables)

### Step 1.3: Configure Authentication (Embedded App)

DelayGuard uses **Shopify Embedded App authentication** with session tokens. This provides:
- ✅ No separate login system required
- ✅ Automatic authentication through Shopify Admin
- ✅ Secure JWT-based session tokens
- ✅ Stateless architecture

**Important Notes:**
1. **Session Tokens**: The app uses App Bridge to retrieve session tokens (JWT) that are validated by the backend
2. **SHOPIFY_API_SECRET**: This is critical for JWT verification - keep it secret!
3. **Embedded Mode**: Must be enabled in app settings (see above)
4. **App Bridge**: Frontend automatically handles token generation and refresh

**No additional configuration required** - authentication is handled automatically once environment variables are set.

For detailed authentication documentation, see [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md).

---

## 2. Database Setup

### Option A: Neon (Recommended - Free tier available)

1. Go to [Neon.tech](https://neon.tech)
2. Create new project: **delayguard-production**
3. Choose region closest to your users
4. Copy connection string:
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```

### Option B: Supabase

1. Go to [Supabase.com](https://supabase.com)
2. Create new project
3. Navigate to **Database** → **Connection string**
4. Copy **Connection pooling** string

### Step 2.1: Run Database Migrations

```bash
cd delayguard-app

# Set database URL temporarily
export DATABASE_URL="postgresql://..."

# Run migrations
npm run db:migrate:prod
```

### Expected Tables Created

- `shops` - Store shop information
- `orders` - Order data from Shopify
- `fulfillments` - Shipping fulfillment data
- `delay_alerts` - Generated delay alerts
- `app_settings` - Per-shop app configuration
- `subscriptions` - Billing and subscription data (NEW)

---

## 3. Redis Setup

### Using Upstash (Recommended - Free tier available)

1. Go to [Upstash.com](https://upstash.com)
2. Create new Redis database
3. Choose region closest to your users
4. Select **TLS enabled**
5. Copy connection string:
   ```
   rediss://default:password@host:6379
   ```

### Redis Usage in App

- **Caching**: API responses, tracking data
- **Queue**: BullMQ job processing
- **Rate limiting**: Request throttling
- **Session storage**: User sessions

---

## 4. External API Keys

### 4.1: ShipEngine API

1. Go to [ShipEngine.com](https://www.shipengine.com)
2. Sign up for account
3. Create API key
4. Copy **Production API key**

**Pricing**: 
- Free tier: 10,000 requests/month
- Paid tier: $20+/month for higher limits

### 4.2: SendGrid (Email Notifications)

1. Go to [SendGrid.com](https://sendgrid.com)
2. Sign up for account
3. Navigate to **Settings** → **API Keys**
4. Create new API key with **Full Access**
5. Copy API key

**Pricing**:
- Free tier: 100 emails/day
- Essential: $19.95/month for 50K emails

### 4.3: Twilio (SMS Notifications)

1. Go to [Twilio.com](https://www.twilio.com)
2. Sign up for account
3. Get phone number
4. Copy credentials:
   - Account SID
   - Auth Token
   - Phone number

**Pricing**:
- Pay-as-you-go: ~$0.0075/SMS
- Monthly base: $15/month minimum

---

## 5. Vercel Deployment

### Step 5.1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 5.2: Login to Vercel

```bash
vercel login
```

### Step 5.3: Deploy Application

```bash
cd delayguard-app

# Deploy to production
vercel --prod

# Follow prompts and configure settings
```

### Step 5.4: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

---

## 6. Environment Variables

### ✅ CONFIGURATION COMPLETE (Oct 23, 2025)

**Status**: All 14 required environment variables have been configured in Vercel  
**Location**: Vercel Dashboard → Project Settings → Environment Variables  
**Security**: All sensitive values are properly masked and encrypted

### Configured Variables (All Environments: Production, Preview, Development)

#### ✅ Shopify Authentication (4 variables - CRITICAL)
```env
SHOPIFY_API_KEY                    ✅ Configured (from Shopify Partners Dashboard)
SHOPIFY_API_SECRET                 ✅ Configured (CRITICAL: Used for JWT verification!)
SHOPIFY_SCOPES                     ✅ Configured (read_orders,write_orders,read_fulfillments,write_fulfillments)
REACT_APP_SHOPIFY_API_KEY          ✅ Configured (Frontend App Bridge - same as SHOPIFY_API_KEY)
```

#### ✅ Database (1 variable)
```env
DATABASE_URL                       ✅ Configured (PostgreSQL connection with SSL)
```

#### ✅ Redis/Queue (3 variables)
```env
REDIS_URL                          ✅ Configured (Upstash Redis with TLS)
UPSTASH_REDIS_REST_URL             ✅ Configured (Upstash REST API endpoint)
UPSTASH_REDIS_REST_TOKEN           ✅ Configured (Upstash authentication token)
```

#### ✅ External APIs (5 variables)
```env
SHIPENGINE_API_KEY                 ✅ Configured (Multi-carrier tracking)
SENDGRID_API_KEY                   ✅ Configured (Email notifications)
TWILIO_ACCOUNT_SID                 ✅ Configured (SMS notifications)
TWILIO_AUTH_TOKEN                  ✅ Configured (Twilio authentication)
TWILIO_PHONE_NUMBER                ✅ Configured (Sender phone number)
```

#### ✅ Runtime Configuration (1 variable)
```env
NODE_ENV                           ✅ Configured (Set to 'production')
```

#### 🔄 Auto-Provided by Vercel
```env
VERCEL_URL                         ✅ Automatically provided by Vercel (no manual config needed)
PORT                               ✅ Automatically provided by Vercel
```

#### ⚠️ Optional: Monitoring (Not Required for Submission)
```env
SENTRY_DSN                         ⚠️ Optional (Can be added later for error tracking)
```

---

### 🔒 Security Notes

**✅ ALL SECRETS PROPERLY SECURED**:
- All environment variables are stored in Vercel's encrypted vault
- Sensitive values are masked in the Vercel UI
- Values are injected at runtime (never in repository)
- `.env` files are excluded from Git via `.gitignore`
- No secrets are exposed in client-side code (except `REACT_APP_*` which is safe)

**⚠️ NEVER commit these files to Git**:
- `.env`
- `.env.local`
- `.env.production`
- `.env.development`

All secret values remain only in Vercel's secure environment variable storage.

### Authentication Environment Variables (CRITICAL)

⚠️ **IMPORTANT**: These variables are essential for authentication to work:

1. **SHOPIFY_API_SECRET**
   - Used to verify JWT session tokens from App Bridge
   - **MUST match** the API secret in Shopify Partners dashboard
   - Keep this secret! Never expose in client-side code
   - Without this, all API requests will fail with 401 Unauthorized

2. **SHOPIFY_API_KEY**
   - Used by App Bridge to identify your app
   - Must match the API key in Shopify Partners dashboard
   - Needs to be set in both backend AND frontend (as REACT_APP_SHOPIFY_API_KEY)

3. **REACT_APP_SHOPIFY_API_KEY**
   - Frontend version of API key
   - Read by App Bridge provider
   - Set to same value as SHOPIFY_API_KEY

### Environment Variable Checklist ✅ ALL COMPLETE

#### Authentication (CRITICAL - Must be set!)
- [x] SHOPIFY_API_KEY _(Backend)_ ✅
- [x] SHOPIFY_API_SECRET _(Backend - for JWT verification)_ ✅
- [x] REACT_APP_SHOPIFY_API_KEY _(Frontend - for App Bridge)_ ✅
- [x] SHOPIFY_SCOPES ✅

#### Infrastructure
- [x] DATABASE_URL ✅
- [x] REDIS_URL ✅
- [x] UPSTASH_REDIS_REST_URL ✅
- [x] UPSTASH_REDIS_REST_TOKEN ✅
- [x] NODE_ENV=production ✅

#### External Services
- [x] SHIPENGINE_API_KEY ✅
- [x] SENDGRID_API_KEY ✅
- [x] TWILIO_ACCOUNT_SID ✅
- [x] TWILIO_AUTH_TOKEN ✅
- [x] TWILIO_PHONE_NUMBER ✅

#### Optional (Can Add Later)
- [ ] SENTRY_DSN _(Error monitoring - not required for submission)_

**Total: 14/14 required variables configured** ✅

---

## 7. Post-Deployment Verification

### Step 7.1: Health Check

```bash
curl https://your-app.vercel.app/api/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T12:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

### Step 7.2: Test Shopify Authentication

This is critical! The app uses Shopify Embedded App authentication with session tokens.

1. **Install app on test store**
   ```bash
   # From Shopify Partners dashboard:
   # Apps → Your App → Test on development store
   ```

2. **Complete OAuth flow**
   - Should redirect to `/auth` endpoint
   - Grant permissions
   - Redirect to app homepage

3. **Verify embedded app loads**
   - Open app from Shopify Admin
   - App should load inside Shopify Admin (embedded)
   - No separate login screen should appear

4. **Test API authentication**
   - Open browser console in Shopify Admin
   - Run this test:
   ```javascript
   // Get session token
   const token = await app.sessionToken.getSessionToken();
   console.log('Token received:', !!token);
   
   // Test authenticated API call
   const response = await fetch('/api/health', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   console.log('API Response:', await response.json());
   ```

5. **Check database for shop entry**
   ```sql
   SELECT shop_domain, created_at FROM shops WHERE shop_domain = 'your-test-store.myshopify.com';
   ```

6. **Verify real data loading**
   - Dashboard should show real data (not mock data)
   - Alerts, orders, and settings should load from API
   - Check browser Network tab for API calls with Authorization headers

**Expected Behavior:**
- ✅ No 401 Unauthorized errors in console
- ✅ API calls include `Authorization: Bearer <token>` header
- ✅ Real data displays (check if it matches your test store)
- ✅ Settings can be updated and persist

**Troubleshooting:**
- If 401 errors: Check SHOPIFY_API_SECRET is set correctly
- If REACT_APP_SHOPIFY_API_KEY error: Set frontend env var in Vercel
- If mock data shows: Check browser console for API errors

### Step 7.3: Test Webhook Endpoints

Use Shopify's webhook testing feature:

1. Go to Shopify admin
2. **Settings** → **Notifications** → **Webhooks**
3. Send test webhook for each endpoint
4. Verify 200 OK responses

### Step 7.4: Verify GDPR Endpoints

```bash
# Test GDPR endpoints are accessible
curl https://your-app.vercel.app/webhooks/gdpr/customers/data_request
# Should return 401 (Unauthorized) without HMAC
```

### Step 7.5: Test Billing Flow

1. Navigate to `/billing/plans`
2. Attempt to subscribe to Pro plan
3. Verify charge creation
4. Check subscription in database

---

## 8. Monitoring & Maintenance

### Set Up Monitoring

1. **Vercel Analytics**: Automatically enabled
2. **Uptime Monitoring**: Use UptimeRobot or similar
3. **Error Tracking**: Configure Sentry (optional)
4. **Database Monitoring**: Use provider's dashboard

### Regular Maintenance Tasks

**Daily**:
- Check error logs in Vercel dashboard
- Monitor API rate limits
- Review alert queue status

**Weekly**:
- Review database performance
- Check Redis memory usage
- Analyze webhook delivery rates

**Monthly**:
- Review API costs
- Optimize database queries
- Update dependencies
- Security audit

---

## 9. Troubleshooting

### Common Issues

#### Database Connection Fails

```
Error: connect ETIMEDOUT
```

**Solution**:
1. Verify DATABASE_URL is correct
2. Check database firewall rules
3. Ensure SSL mode is configured
4. Test connection locally first

#### Redis Connection Fails

```
Error: Redis connection timeout
```

**Solution**:
1. Verify REDIS_URL format (rediss:// for SSL)
2. Check Redis instance is running
3. Verify IP whitelist settings
4. Test with Redis CLI

#### Webhooks Not Receiving

**Solution**:
1. Check webhook URLs in Shopify admin
2. Verify HMAC signature validation
3. Review Vercel function logs
4. Test webhook manually with curl

#### Billing Charges Not Creating

**Solution**:
1. Verify Shopify API credentials
2. Check RecurringApplicationCharge permissions
3. Review Shopify API logs
4. Test in development mode first

### Getting Help

- **Email**: augustok87@gmail.com
- **Documentation**: /docs directory
- **Shopify Support**: partners.shopify.com/support

---

## Security Checklist

Before going live, verify:

- [ ] All environment variables are set
- [ ] SHOPIFY_API_SECRET is secure (not exposed)
- [ ] Database uses SSL connections
- [ ] Redis uses TLS encryption
- [ ] HMAC webhook verification working
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] CSRF protection active
- [ ] GDPR webhooks implemented
- [ ] Error messages don't expose sensitive data

---

## Launch Checklist

- [ ] All environment variables configured
- [ ] Database migrated successfully
- [ ] Redis connected and functional
- [ ] External APIs tested
- [ ] Shopify app created and configured
- [ ] Webhooks registered
- [ ] GDPR endpoints verified
- [ ] Billing system tested
- [ ] Health checks passing
- [ ] Monitoring enabled
- [ ] Legal documents published
- [ ] Support email active

---

## Next Steps After Production Setup

1. ✅ **Test with Development Store**: Install and test all features
2. ✅ **Submit to Shopify App Store**: See SHOPIFY_SUBMISSION_CHECKLIST.md
3. ✅ **Monitor Performance**: Set up alerts and dashboards
4. ✅ **Gather Feedback**: Beta test with friendly merchants
5. ✅ **Iterate**: Improve based on real-world usage

---

**Congratulations!** Your DelayGuard app is now ready for production! 🎉

For questions or issues, contact: augustok87@gmail.com

