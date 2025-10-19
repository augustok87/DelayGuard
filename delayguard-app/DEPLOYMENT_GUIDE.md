# DelayGuard Deployment Guide

This guide provides step-by-step instructions for deploying DelayGuard to production with proper environment configuration.

## 🚨 **IMPORTANT: Environment Configuration Required**

The application **requires proper environment configuration** to function. Without it, the API will return connection errors.

## 📋 **Pre-Deployment Checklist**

- [ ] All required environment variables configured
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] External API keys validated
- [ ] Health check endpoints working
- [ ] Code quality issues addressed (optional but recommended)

## 🔧 **Step 1: Environment Variables Setup**

### Required Variables

Set these in your Vercel dashboard (Settings → Environment Variables):

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

### Optional Variables

```bash
# Monitoring
SENTRY_DSN=your_sentry_dsn

# Security
CSRF_SECRET=your_csrf_secret
JWT_SECRET=your_jwt_secret
```

## 🗄️ **Step 2: Database Setup**

### Option A: Supabase (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Get connection string from Settings → Database

2. **Set Environment Variable**
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

3. **Run Migrations** (if needed)
   ```bash
   npm run db:migrate:prod
   ```

### Option B: Neon

1. **Create Neon Database**
   - Go to [neon.tech](https://neon.tech)
   - Create new database
   - Get connection string

2. **Set Environment Variable**
   ```
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb
   ```

## 🔴 **Step 3: Redis Setup**

### Option A: Upstash (Recommended)

1. **Create Upstash Database**
   - Go to [upstash.com](https://upstash.com)
   - Create new Redis database
   - Get connection string

2. **Set Environment Variable**
   ```
   REDIS_URL=redis://default:password@redis-xxx.upstash.io:6379
   ```

### Option B: Redis Cloud

1. **Create Redis Cloud Database**
   - Go to [redis.com](https://redis.com)
   - Create new database
   - Get connection string

## 🔌 **Step 4: External API Setup**

### ShipEngine

1. **Create Account**
   - Go to [shipengine.com](https://shipengine.com)
   - Sign up for free account
   - Get API key from dashboard

2. **Set Environment Variable**
   ```
   SHIPENGINE_API_KEY=TEST_xxx
   ```

### SendGrid

1. **Create Account**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Sign up for free account
   - Create API key

2. **Set Environment Variable**
   ```
   SENDGRID_API_KEY=SG.xxx
   ```

### Twilio

1. **Create Account**
   - Go to [twilio.com](https://twilio.com)
   - Sign up for free account
   - Get Account SID and Auth Token

2. **Set Environment Variables**
   ```
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

## 🚀 **Step 5: Deploy to Vercel**

### Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy to preview first
vercel
```

### Verify Deployment

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Should return detailed health status
```

## ✅ **Step 6: Post-Deployment Verification**

### Health Check

```bash
# Full health check
curl https://your-app.vercel.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-18T23:24:14.054Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "external_apis": {
      "shipengine": { "status": "healthy" },
      "sendgrid": { "status": "healthy" },
      "twilio": { "status": "healthy" }
    }
  }
}
```

### Test Endpoints

```bash
# Test root endpoint
curl https://your-app.vercel.app/

# Test monitoring
curl https://your-app.vercel.app/api/monitoring
```

## 🔍 **Troubleshooting**

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

### Debug Commands

```bash
# Test environment locally
npm run test:env

# Test database connection
npm run test:db

# Test Redis connection
npm run test:redis
```

## 📊 **Monitoring**

### Health Check Endpoints

- **Full Health Check**: `GET /api/health`
- **Simple Health Check**: `GET /api/health?simple=true`
- **Service Status**: `GET /api/monitoring`

### Expected Health Response

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

## 🚨 **Security Best Practices**

1. **Never commit .env files**
2. **Use strong, unique passwords**
3. **Rotate API keys regularly**
4. **Use environment-specific configurations**
5. **Enable Vercel's environment variable encryption**

## 📝 **Next Steps After Deployment**

1. **Monitor Health**: Set up monitoring for health check endpoints
2. **Test Functionality**: Verify all features work as expected
3. **Performance Monitoring**: Monitor response times and memory usage
4. **Error Tracking**: Set up Sentry or similar for error monitoring
5. **Backup Strategy**: Ensure database backups are configured

## 🆘 **Support**

If you encounter issues:

1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Verify all environment variables are set correctly
3. Test connections using the provided npm scripts
4. Check Vercel logs for detailed error messages

---

**Remember**: The application requires proper environment configuration to function. Without it, the API will return connection errors.