# Environment Variables Setup Guide

## Required Environment Variables

The DelayGuard app requires the following environment variables to be configured in your Vercel dashboard:

### 1. Database Configuration
```
DATABASE_URL=postgresql://username:password@host:port/database
```
**Purpose**: PostgreSQL database connection for storing app data, orders, and analytics
**Recommended**: Use a managed PostgreSQL service like Neon, Supabase, or AWS RDS

### 2. Redis Configuration
```
REDIS_URL=redis://username:password@host:port
```
**Purpose**: Redis cache and queue management for background processing
**Recommended**: Use Upstash Redis or AWS ElastiCache

### 3. Shopify App Configuration
```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
```
**Purpose**: Shopify app authentication and API access
**How to get**: Create a Shopify app in your Partner Dashboard

### 4. ShipEngine API (Carrier Tracking)
```
SHIPENGINE_API_KEY=your_shipengine_api_key
```
**Purpose**: Track shipments and detect delays from carriers
**How to get**: Sign up at https://www.shipengine.com/

### 5. SendGrid (Email Notifications)
```
SENDGRID_API_KEY=your_sendgrid_api_key
```
**Purpose**: Send email notifications to customers about delays
**How to get**: Sign up at https://sendgrid.com/

### 6. Twilio (SMS Notifications)
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```
**Purpose**: Send SMS notifications to customers about delays
**How to get**: Sign up at https://www.twilio.com/

## How to Configure in Vercel

1. Go to your Vercel dashboard
2. Select your DelayGuard project
3. Go to Settings → Environment Variables
4. Add each variable with its corresponding value
5. Make sure to set the environment to "Production" for all variables
6. Redeploy your application

## Testing the Configuration

After setting up the environment variables, you can test the configuration by:

1. **Health Check**: `curl https://your-app.vercel.app/health`
2. **API Status**: `curl https://your-app.vercel.app/api`
3. **Database Connection**: Check the logs for successful database connection
4. **Redis Connection**: Check the logs for successful Redis connection

## Development Setup

For local development, create a `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your actual values
nano .env
```

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for all services
- Regularly rotate API keys and secrets
- Monitor usage and costs for all external services

## Service Recommendations

### Database
- **Neon** (Recommended): https://neon.tech/ - Free tier available
- **Supabase**: https://supabase.com/ - Free tier available
- **AWS RDS**: https://aws.amazon.com/rds/ - Pay-as-you-go

### Redis
- **Upstash** (Recommended): https://upstash.com/ - Free tier available
- **AWS ElastiCache**: https://aws.amazon.com/elasticache/ - Pay-as-you-go

### Email
- **SendGrid**: https://sendgrid.com/ - Free tier: 100 emails/day
- **Mailgun**: https://www.mailgun.com/ - Free tier: 5,000 emails/month

### SMS
- **Twilio**: https://www.twilio.com/ - Pay-as-you-go, $0.0075/SMS
- **AWS SNS**: https://aws.amazon.com/sns/ - Pay-as-you-go

### Carrier Tracking
- **ShipEngine**: https://www.shipengine.com/ - Free tier: 500 labels/month
- **EasyPost**: https://www.easypost.com/ - Free tier: 100 labels/month
