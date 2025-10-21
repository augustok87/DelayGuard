# 🔐 DelayGuard Authentication Implementation Guide

**Complete guide to the Shopify Embedded App authentication system**

## 📚 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

DelayGuard uses **Shopify Embedded App authentication** with **session tokens** (JWT) to secure API requests. This eliminates the need for a separate login system while providing enterprise-grade security.

### Key Features

✅ **No separate login system** - Merchants authenticate through Shopify Admin  
✅ **Session token-based** - JWT tokens with automatic refresh  
✅ **Secure by default** - HMAC verification, token expiry, shop validation  
✅ **Stateless** - No session storage required  
✅ **Production-ready** - Comprehensive test coverage (51 tests)

### How It Works

```
1. Merchant installs app → OAuth flow (handled by Shopify)
2. Merchant opens app in Shopify Admin → Embedded in iframe
3. Frontend gets session token from App Bridge
4. Frontend passes token in Authorization header
5. Backend validates token & fetches shop data
6. API returns merchant-specific data
```

---

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  Shopify Admin  │
│   (iframe host)  │
└────────┬────────┘
         │
         │ Embeds
         ↓
┌─────────────────┐     Session Token      ┌──────────────┐
│  Frontend       │ ──────────────────────→│  Backend     │
│  (React + App   │                         │  (Koa + DB)  │
│   Bridge)       │←─────────────────────────│              │
└─────────────────┘     Real merchant data  └──────────────┘
```

### Components

| Component | Purpose | Key Files |
|-----------|---------|-----------|
| **ShopifyProvider** | Initializes App Bridge | `src/components/ShopifyProvider.tsx` |
| **useApiClient** | Hook for authenticated requests | `src/hooks/useApiClient.ts` |
| **ApiClient** | Handles session tokens | `src/utils/api-client.ts` |
| **requireAuth** | Backend auth middleware | `src/middleware/shopify-session.ts` |
| **API Routes** | Protected endpoints | `src/routes/api.ts` |

---

## Backend Implementation

### 1. Authentication Middleware

**File:** `delayguard-app/src/middleware/shopify-session.ts`

```typescript
import { requireAuth } from '../middleware/shopify-session';

// Validates session token and attaches shop info to context
router.get('/api/alerts', requireAuth, async (ctx) => {
  const shopDomain = ctx.state.shopDomain; // Guaranteed to exist
  // ... fetch data for this shop
});
```

**Features:**
- ✅ JWT verification with SHOPIFY_API_SECRET
- ✅ Token expiry validation
- ✅ Shop lookup in database
- ✅ Automatic error handling
- ✅ Development mode bypass (for local testing)

**Test Coverage:** 18 tests, 89% statement coverage

### 2. API Routes with Authentication

**File:** `delayguard-app/src/routes/api.ts`

All API routes are protected by `requireAuth` middleware:

```typescript
router.get('/api/alerts', requireAuth, async (ctx) => {
  const shopDomain = getShopDomain(ctx);
  const alerts = await query(
    'SELECT * FROM delay_alerts WHERE shop_domain = $1',
    [shopDomain]
  );
  ctx.body = { success: true, data: alerts };
});
```

**Available Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/alerts` | GET | Fetch delay alerts for shop |
| `/api/orders` | GET | Fetch orders with alerts |
| `/api/settings` | GET | Get app settings |
| `/api/settings` | PUT | Update app settings |
| `/api/analytics` | GET | Get statistics & analytics |
| `/api/shop` | GET | Get shop information |
| `/api/health` | GET | Health check (no auth) |

**Test Coverage:** 18 tests, all endpoints tested

### 3. Token Validation

The middleware validates the following JWT claims:

```typescript
{
  iss: "https://{shop-domain}/admin",  // Issuer (shop URL)
  dest: "https://{shop-domain}",       // Destination
  aud: "{SHOPIFY_API_KEY}",            // Audience (your app)
  sub: "user-123",                      // Subject (user ID)
  exp: 1234567890,                      // Expiry timestamp
  nbf: 1234567880,                      // Not before
  iat: 1234567880,                      // Issued at
  jti: "jwt-123",                       // JWT ID
  sid: "session-123"                    // Session ID
}
```

---

## Frontend Implementation

### 1. App Bridge Provider

**File:** `delayguard-app/src/components/ShopifyProvider.tsx`

Wraps your entire app to enable Shopify features:

```tsx
import { ShopifyProvider } from './components/ShopifyProvider';

function App() {
  return (
    <ShopifyProvider>
      {/* Your app components */}
    </ShopifyProvider>
  );
}
```

**Configuration:**
- Reads shop from URL parameters (`?shop=example.myshopify.com`)
- Reads host from URL parameters (for OAuth)
- Falls back to development.myshopify.com in dev mode

### 2. Authenticated API Client

**File:** `delayguard-app/src/utils/api-client.ts`

Type-safe API client that automatically handles session tokens:

```typescript
import { apiClient } from '../utils/api-client';

// API client automatically:
// 1. Gets session token from App Bridge
// 2. Includes it in Authorization header
// 3. Handles errors and retries

const response = await apiClient.getAlerts();
if (response.success) {
  console.log(response.data); // Alerts data
}
```

**Available Methods:**
- `getAlerts()` - Fetch delay alerts
- `getOrders(limit?)` - Fetch orders
- `getSettings()` - Fetch settings
- `updateSettings(settings)` - Update settings
- `getAnalytics()` - Fetch analytics
- `getShop()` - Fetch shop info
- `health()` - Health check

**Test Coverage:** 15 tests, 100% statement coverage

### 3. useApiClient Hook

**File:** `delayguard-app/src/hooks/useApiClient.ts`

React hook that provides the configured API client:

```tsx
import { useApiClient } from '../hooks/useApiClient';

function MyComponent() {
  const api = useApiClient();
  
  useEffect(() => {
    async function fetchData() {
      const alerts = await api.getAlerts();
      // Handle response
    }
    fetchData();
  }, [api]);
}
```

### 4. Data Fetching with Real API

**File:** `delayguard-app/src/components/EnhancedDashboard/hooks/useDashboardData.ts`

Example of fetching real data:

```typescript
const api = useApiClient();

// Fetch all data in parallel
const [alerts, orders, settings, analytics] = await Promise.all([
  api.getAlerts(),
  api.getOrders(50),
  api.getSettings(),
  api.getAnalytics(),
]);
```

---

## Testing

### Test Structure

```
delayguard-app/src/tests/
├── unit/
│   ├── middleware/
│   │   └── shopify-session.test.ts (18 tests)
│   ├── routes/
│   │   └── api-routes.test.ts (18 tests)
│   └── utils/
│       └── api-client.test.ts (15 tests)
```

### Running Tests

```bash
# Run all authentication tests
cd delayguard-app
npm test -- --testPathPattern="(shopify-session|api-routes|api-client)"

# Run with coverage
npm test -- --coverage --testPathPattern="(shopify-session|api-routes|api-client)"

# Run specific test file
npm test -- src/tests/unit/middleware/shopify-session.test.ts
```

### Test Results

✅ **51 total tests**  
✅ **100% passing**  
✅ **89% middleware coverage**  
✅ **100% API client coverage**

---

## Development Workflow

### Local Development Setup

1. **Set Environment Variables**

```bash
# .env file
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
SHOPIFY_SCOPES=read_orders,write_orders
```

2. **Start Development Server**

```bash
cd delayguard-app
npm run dev
```

3. **Access in Development Mode**

In development, the app:
- Uses `development.myshopify.com` as default shop
- Bypasses authentication if no token provided
- Logs detailed debug information

### Testing Authentication Locally

**Option 1: Use ngrok**

```bash
# Expose local server
ngrok http 3000

# Update Shopify app settings with ngrok URL
# Install app to test store
# Open app in Shopify Admin
```

**Option 2: Mock Authentication**

```typescript
// Set NODE_ENV=development
// App automatically uses development.myshopify.com
// No authentication required for testing
```

### Adding New Protected Endpoints

1. **Add Route with requireAuth:**

```typescript
// src/routes/api.ts
router.get('/api/my-endpoint', requireAuth, async (ctx) => {
  const shopDomain = getShopDomain(ctx);
  // ... your logic
});
```

2. **Add API Client Method:**

```typescript
// src/utils/api-client.ts
async getMyData() {
  return this.request<MyDataType>('/my-endpoint');
}
```

3. **Write Tests:**

```typescript
// src/tests/unit/routes/api-routes.test.ts
it('should fetch my data', async () => {
  mockAuth(); // Helper to mock authentication
  mockQuery.mockResolvedValueOnce([{ /* data */ }]);
  
  const response = await request(app.callback())
    .get('/api/my-endpoint')
    .set('Authorization', `Bearer ${testToken}`)
    .expect(200);
    
  expect(response.body.success).toBe(true);
});
```

---

## Production Deployment

### Required Environment Variables

```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your-production-api-key
SHOPIFY_API_SECRET=your-production-api-secret
SHOPIFY_SCOPES=read_orders,write_orders,read_customers

# Database
DATABASE_URL=postgresql://user:pass@host:5432/delayguard

# Redis (for caching/queues)
REDIS_URL=redis://user:pass@host:6379

# Node Environment
NODE_ENV=production

# Frontend Environment (for App Bridge)
REACT_APP_SHOPIFY_API_KEY=your-production-api-key
```

### Vercel Deployment

1. **Deploy Backend:**

```bash
cd delayguard-app
vercel deploy --prod
```

2. **Set Environment Variables in Vercel:**

Go to Vercel Dashboard → Settings → Environment Variables

3. **Update Shopify App Settings:**

- App URL: `https://your-app.vercel.app`
- Allowed redirection URLs: `https://your-app.vercel.app/auth/callback`

### Security Checklist

✅ **SHOPIFY_API_SECRET is set** (for JWT verification)  
✅ **Database credentials are secure** (not in code)  
✅ **HTTPS is enabled** (Vercel provides this)  
✅ **CORS is configured properly** (for embedded apps)  
✅ **Rate limiting is enabled** (see middleware/rate-limiting.ts)  
✅ **Input sanitization is active** (see middleware/input-sanitization.ts)  
✅ **CSRF protection is configured** (see middleware/csrf-protection.ts)

---

## Troubleshooting

### Common Issues

#### 1. "Unauthorized: Missing Authorization header"

**Cause:** Frontend not passing session token  
**Solution:**
```typescript
// Ensure ShopifyProvider wraps your app
// Check that useApiClient is being used
// Verify App Bridge is initialized
```

#### 2. "Shop not found in database"

**Cause:** Shop hasn't completed OAuth flow  
**Solution:**
```bash
# Re-install the app from Shopify Partners dashboard
# Or manually add shop to database:
INSERT INTO shops (shop_domain, access_token, scope)
VALUES ('test.myshopify.com', 'token', ARRAY['read_orders']);
```

#### 3. "Session expired"

**Cause:** JWT token has expired  
**Solution:**
- App Bridge automatically refreshes tokens
- If issue persists, check system time synchronization
- Verify SHOPIFY_API_SECRET is correct

#### 4. "Invalid session token"

**Cause:** Token signature verification failed  
**Solution:**
```bash
# Check that SHOPIFY_API_SECRET matches Shopify Partners dashboard
# Verify token format (should be JWT)
# Ensure token is being passed correctly (Bearer prefix)
```

### Debug Mode

Enable detailed logging:

```typescript
// src/utils/logger.ts
logger.level = 'debug';

// Now you'll see:
// - Session token validation details
// - API request/response logs
// - Database query logs
```

### Testing in Production

```bash
# Test API health
curl https://your-app.vercel.app/api/health

# Test with authentication (from browser console in Shopify Admin)
const token = await app.sessionToken.getSessionToken();
const response = await fetch('/api/alerts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Best Practices

### Security

1. **Never log sensitive data**
   - Don't log tokens, access tokens, or customer data
   - Use `logger.debug()` for development only

2. **Validate all inputs**
   - Use input sanitization middleware
   - Validate query parameters and request bodies

3. **Use HTTPS everywhere**
   - Shopify requires HTTPS for embedded apps
   - Vercel provides this automatically

### Performance

1. **Cache session tokens**
   - App Bridge caches tokens automatically
   - Don't fetch new token for every request

2. **Batch API calls**
   - Use `Promise.all()` for parallel fetching
   - Reduce number of round-trips

3. **Use database indexes**
   - Index `shop_domain` column
   - Index frequently queried columns

### Maintainability

1. **Keep middleware simple**
   - One responsibility per middleware
   - Easy to test and reason about

2. **Use TypeScript**
   - Strong typing prevents errors
   - Better IDE support and refactoring

3. **Write tests first (TDD)**
   - All new endpoints should have tests
   - Maintain >90% coverage

---

## Resources

### Official Documentation

- [Shopify App Bridge](https://shopify.dev/docs/api/app-bridge-library)
- [Session Tokens](https://shopify.dev/docs/apps/auth/oauth/session-tokens)
- [OAuth Flow](https://shopify.dev/docs/apps/auth/oauth)
- [App Security Best Practices](https://shopify.dev/docs/apps/best-practices/security)

### Internal Documentation

- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Production Setup](./PRODUCTION_SETUP.md)
- [API Documentation](./delayguard-app/docs/api/)
- [Testing Guide](./delayguard-app/docs/README.md)

---

## Summary

✅ **Backend:** 36 tests (middleware + API routes), 89%+ coverage  
✅ **Frontend:** 15 tests (API client), 100% coverage  
✅ **Security:** JWT verification, shop validation, HTTPS  
✅ **Performance:** Stateless, parallel fetching, caching  
✅ **Developer Experience:** Type-safe, well-documented, TDD

**Total:** 51 comprehensive tests covering the entire authentication flow.

Your DelayGuard app is now **production-ready** with world-class authentication! 🎉

---

*Last Updated: October 2025*  
*Version: 1.0.0*

