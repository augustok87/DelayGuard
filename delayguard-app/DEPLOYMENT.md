# DelayGuard Production Deployment Guide

## Vercel Deployment Configuration

### 1. Environment Variables Setup

Set the following environment variables in your Vercel dashboard under Settings > Environment Variables:

#### Required Variables
```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_fulfillments,write_fulfillments
DATABASE_URL=your_supabase_database_url
REDIS_URL=your_upstash_redis_url
SHIPENGINE_API_KEY=your_shipengine_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
NODE_ENV=production
```

### 2. Database Setup (Supabase)

1. Create a new Supabase project
2. Run the database migrations:
   ```bash
   npm run db:migrate
   ```
3. Copy the database URL to Vercel environment variables

### 3. Redis Setup (Upstash)

1. Create a new Upstash Redis database
2. Copy the Redis URL to Vercel environment variables
3. Ensure the database is accessible from Vercel

### 4. Shopify App Configuration

1. Update your Shopify app settings:
   - App URL: `https://your-app.vercel.app`
   - Allowed redirection URLs: `https://your-app.vercel.app/auth/callback`
   - Webhook endpoints:
     - `https://your-app.vercel.app/webhooks/orders/updated`
     - `https://your-app.vercel.app/webhooks/fulfillments/updated`
     - `https://your-app.vercel.app/webhooks/orders/paid`

### 5. Deployment Steps

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel link
   ```

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables:**
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Add all required variables listed above

4. **Configure Custom Domain (Optional):**
   - Go to Vercel Dashboard > Your Project > Settings > Domains
   - Add your custom domain
   - Update DNS records as instructed

### 6. Post-Deployment Verification

1. **Health Check:**
   ```bash
   curl https://your-app.vercel.app/health
   ```

2. **Test API Endpoints:**
   ```bash
   curl https://your-app.vercel.app/api/stats
   ```

3. **Verify Shopify Integration:**
   - Install the app in a test store
   - Test webhook delivery
   - Verify OAuth flow

### 7. Monitoring Setup

1. **Vercel Analytics:**
   - Enable in Vercel Dashboard > Analytics

2. **Error Monitoring:**
   - The app includes built-in error tracking
   - Check Vercel function logs for errors

3. **Performance Monitoring:**
   - Monitor function execution times
   - Set up alerts for high error rates

### 8. Security Considerations

1. **Environment Variables:**
   - Never commit sensitive data to git
   - Use Vercel's environment variable encryption

2. **HTTPS:**
   - Vercel provides automatic HTTPS
   - Ensure all external API calls use HTTPS

3. **Rate Limiting:**
   - Built-in rate limiting for external APIs
   - Monitor for abuse patterns

### 9. Scaling Considerations

1. **Database Connections:**
   - Supabase handles connection pooling
   - Monitor connection limits

2. **Redis:**
   - Upstash provides automatic scaling
   - Monitor memory usage

3. **Function Limits:**
   - Vercel Pro: 60s execution time
   - Monitor function timeouts

### 10. Troubleshooting

#### Common Issues:

1. **Environment Variables Not Loading:**
   - Check Vercel dashboard settings
   - Redeploy after adding variables

2. **Database Connection Issues:**
   - Verify DATABASE_URL format
   - Check Supabase project status

3. **Redis Connection Issues:**
   - Verify REDIS_URL format
   - Check Upstash database status

4. **Shopify Webhook Issues:**
   - Verify webhook URLs
   - Check HMAC verification

#### Debug Commands:

```bash
# Check function logs
vercel logs

# Check environment variables
vercel env ls

# Redeploy with debug info
vercel --prod --debug
```

### 11. Performance Optimization

1. **Cold Start Optimization:**
   - Minimize dependencies
   - Use connection pooling
   - Cache frequently used data

2. **Memory Optimization:**
   - Monitor function memory usage
   - Optimize data structures
   - Clean up resources

3. **Response Time Optimization:**
   - Use Redis caching
   - Optimize database queries
   - Minimize external API calls

### 12. Backup and Recovery

1. **Database Backups:**
   - Supabase provides automatic backups
   - Set up additional backup strategy if needed

2. **Code Backups:**
   - Use Git for version control
   - Tag releases for easy rollback

3. **Configuration Backups:**
   - Document all environment variables
   - Keep configuration files in version control

## Support

For deployment issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test locally with production settings
4. Contact support with specific error messages
