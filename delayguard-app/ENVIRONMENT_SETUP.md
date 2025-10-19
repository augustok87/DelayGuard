# Environment Setup Guide

This guide provides step-by-step instructions for configuring DelayGuard in different environments.

## 🚀 Quick Start

### 1. Required Environment Variables

The following environment variables are **required** for production:

```bash
# App Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_fulfillments,write_fulfillments

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Redis
REDIS_URL=redis://username:password@host:port

# External APIs
SHIPENGINE_API_KEY=your_shipengine_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 2. Optional Environment Variables

```bash
# Monitoring
SENTRY_DSN=your_sentry_dsn

# Security
CSRF_SECRET=your_csrf_secret
JWT_SECRET=your_jwt_secret
```

## 🔧 Vercel Deployment

### Step 1: Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your DelayGuard project
3. Go to Settings → Environment Variables
4. Add each required variable:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production, Preview, Development |
| `SHOPIFY_API_KEY` | Your Shopify API key | Production, Preview, Development |
| `SHOPIFY_API_SECRET` | Your Shopify API secret | Production, Preview, Development |
| `SHOPIFY_SCOPES` | `read_orders,write_orders,read_fulfillments,write_fulfillments` | Production, Preview, Development |
| `DATABASE_URL` | Your PostgreSQL connection string | Production, Preview, Development |
| `REDIS_URL` | Your Redis connection string | Production, Preview, Development |
| `SHIPENGINE_API_KEY` | Your ShipEngine API key | Production, Preview, Development |
| `SENDGRID_API_KEY` | Your SendGrid API key | Production, Preview, Development |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | Production, Preview, Development |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | Production, Preview, Development |
| `TWILIO_PHONE_NUMBER` | Your Twilio Phone Number | Production, Preview, Development |

### Step 2: Redeploy

After setting environment variables, redeploy your application:

```bash
vercel --prod
```

### Step 3: Verify Deployment

Test your deployment:

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Should return detailed health status
```

## 🗄️ Database Setup

### PostgreSQL (Recommended: Supabase)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the connection string

2. **Get Connection String**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate:prod
   ```

### Alternative: Neon

1. **Create Neon Database**
   - Go to [neon.tech](https://neon.tech)
   - Create new database
   - Get connection string

2. **Set Environment Variable**
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb
   ```

## 🔴 Redis Setup

### Upstash (Recommended)

1. **Create Upstash Database**
   - Go to [upstash.com](https://upstash.com)
   - Create new Redis database
   - Get connection string

2. **Get Connection String**
   ```
   redis://default:password@redis-xxx.upstash.io:6379
   ```

### Alternative: Redis Cloud

1. **Create Redis Cloud Database**
   - Go to [redis.com](https://redis.com)
   - Create new database
   - Get connection string

## 🔌 External API Setup

### ShipEngine

1. **Create Account**
   - Go to [shipengine.com](https://shipengine.com)
   - Sign up for free account
   - Get API key from dashboard

2. **Set Environment Variable**
   ```bash
   SHIPENGINE_API_KEY=TEST_xxx
   ```

### SendGrid

1. **Create Account**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for free account
   - Create API key

2. **Set Environment Variable**
   ```bash
   SENDGRID_API_KEY=SG.xxx
   ```

### Twilio

1. **Create Account**
   - Go to [twilio.com](https://twilio.com)
   - Sign up for free account
   - Get Account SID and Auth Token

2. **Set Environment Variables**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## 🧪 Testing Environment

### Local Development

1. **Copy Environment Template**
   ```bash
   cp env.example .env
   ```

2. **Update .env with your values**
   ```bash
   # Edit .env file with your actual values
   nano .env
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

### Test Environment Variables

```bash
# Test if all required variables are set
npm run test:env

# Test database connection
npm run test:db

# Test Redis connection
npm run test:redis
```

## 🔍 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   ```
   Error: Reached the max retries per request limit
   ```
   **Solution**: Check `REDIS_URL` is correctly set in Vercel

2. **Database Connection Error**
   ```
   Error: Connection terminated unexpectedly
   ```
   **Solution**: Check `DATABASE_URL` is correctly set in Vercel

3. **API Key Errors**
   ```
   Error: Invalid API key
   ```
   **Solution**: Verify API keys are correct and not placeholder values

### Health Check Endpoints

- **Full Health Check**: `GET /api/health`
- **Simple Health Check**: `GET /api/health?simple=true`
- **Service Status**: `GET /api/monitoring`

### Debug Mode

Enable debug logging:

```bash
DEBUG=delayguard:* npm run dev
```

## 📊 Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-18T23:24:14.054Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 45,
      "last_check": "2025-01-18T23:24:14.054Z"
    },
    "redis": {
      "status": "healthy",
      "response_time": 12,
      "last_check": "2025-01-18T23:24:14.054Z"
    },
    "external_apis": {
      "shipengine": {
        "status": "healthy",
        "response_time": 234,
        "last_check": "2025-01-18T23:24:14.054Z"
      },
      "sendgrid": {
        "status": "healthy",
        "response_time": 156,
        "last_check": "2025-01-18T23:24:14.054Z"
      },
      "twilio": {
        "status": "healthy",
        "response_time": 189,
        "last_check": "2025-01-18T23:24:14.054Z"
      }
    }
  },
  "uptime": 3600000,
  "memory": {
    "used": 45,
    "total": 128,
    "percentage": 35
  }
}
```

## 🚨 Security Best Practices

1. **Never commit .env files**
2. **Use strong, unique passwords**
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Enable Vercel's environment variable encryption**

## 📝 Environment Validation

The application automatically validates environment variables on startup:

- ✅ **All required variables present**
- ✅ **Valid connection strings**
- ✅ **API keys not placeholder values**
- ✅ **Proper data types**

If validation fails, the application will log errors and exit in production mode.

---

**Need Help?** Check the [troubleshooting guide](./TROUBLESHOOTING.md) or contact support.
