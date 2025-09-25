# DelayGuard User Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Configuration](#configuration)
4. [Analytics & Reporting](#analytics--reporting)
5. [Troubleshooting](#troubleshooting)
6. [API Reference](#api-reference)
7. [FAQ](#faq)

## Getting Started

### Installation

1. **From Shopify App Store**
   - Search for "DelayGuard" in the Shopify App Store
   - Click "Add app" and grant necessary permissions
   - Complete the setup wizard

2. **Manual Installation**
   - Download the app package
   - Upload to your Shopify admin
   - Configure environment variables

### Initial Setup

1. **Connect Your Services**
   ```
   Required:
   - Shopify store connection
   - Email service (SendGrid recommended)
   
   Optional:
   - SMS service (Twilio)
   - Enhanced tracking (ShipEngine)
   ```

2. **Configure Basic Settings**
   - Set delay threshold (default: 2 days)
   - Choose notification channels
   - Select notification templates

3. **Test Your Setup**
   - Use the built-in test feature
   - Send test notifications
   - Verify webhook delivery

## Dashboard Overview

### Main Dashboard

The DelayGuard dashboard provides a comprehensive view of your delay detection and notification system.

#### Key Metrics
- **Total Orders**: Number of orders processed
- **Active Alerts**: Current delay alerts
- **Success Rate**: Notification delivery success rate
- **Average Response Time**: System performance metric

#### Navigation Tabs
- **Overview**: Key metrics and recent activity
- **Delay Alerts**: Detailed alert management
- **Orders**: Order tracking and status
- **Settings**: Configuration options
- **Analytics**: Performance metrics and reports

### Real-time Updates

The dashboard automatically refreshes every 30 seconds to show the latest data. You can also manually refresh using the refresh button.

## Configuration

### App Settings

#### Delay Threshold
Set the number of days after which an order is considered delayed.

**Recommended Settings:**
- **E-commerce**: 2-3 days
- **Dropshipping**: 5-7 days
- **International**: 7-10 days

#### Notification Channels

**Email Notifications**
- Enable/disable email alerts
- Configure sender information
- Set delivery preferences

**SMS Notifications**
- Enable/disable SMS alerts
- Configure phone number formatting
- Set message templates

#### Notification Templates

Choose from pre-built templates or create custom ones:

**Default Template**
```
Subject: Update on Your Order #{order_number}

Hi {customer_name},

We wanted to let you know that your order #{order_number} is experiencing a delay in shipping.

Expected delivery: {estimated_delivery_date}
Tracking number: {tracking_number}

We apologize for any inconvenience and appreciate your patience.

Best regards,
{store_name}
```

**Custom Templates**
- Use placeholders for dynamic content
- HTML formatting supported
- Preview before saving

### Advanced Settings

#### API Configuration
- **Rate Limits**: Set API call limits
- **Timeout Settings**: Configure request timeouts
- **Retry Logic**: Set retry attempts and intervals

#### Queue Management
- **Concurrency**: Number of concurrent workers
- **Priority Levels**: Set job priorities
- **Error Handling**: Configure error recovery

#### Caching
- **Cache TTL**: Set cache expiration times
- **Cache Invalidation**: Manual cache clearing
- **Performance Monitoring**: Cache hit rates

## Analytics & Reporting

### Analytics Dashboard

The analytics dashboard provides comprehensive insights into your delay detection performance.

#### Overview Metrics
- **Total Orders**: Orders processed in selected time range
- **Delay Alerts**: Number of alerts generated
- **Average Delay Days**: Mean delay duration
- **Revenue Impact**: Financial impact of delays

#### Performance Metrics
- **Response Time**: Average API response time
- **Success Rate**: Operation success percentage
- **Error Rate**: Failed operation percentage
- **Memory Usage**: System resource utilization

#### Time Series Data
- **Daily Trends**: Orders, alerts, and revenue over time
- **Weekly Patterns**: Identify recurring issues
- **Monthly Reports**: Comprehensive monthly analysis

#### Export Options
- **JSON Format**: Complete data export
- **CSV Format**: Spreadsheet-compatible export
- **PDF Reports**: Formatted reports for sharing

### Real-time Monitoring

#### Live Metrics
- **Active Alerts**: Current unresolved alerts
- **Queue Size**: Pending processing jobs
- **Processing Rate**: Jobs processed per minute
- **System Health**: Overall system status

#### Alert Management
- **Alert History**: Complete alert log
- **Resolution Tracking**: Alert resolution status
- **Performance Analysis**: Alert response times

## Troubleshooting

### Common Issues

#### Notifications Not Sending

**Possible Causes:**
- Invalid API credentials
- Rate limiting
- Template errors
- Service outages

**Solutions:**
1. Verify API credentials
2. Check rate limits
3. Test template syntax
4. Monitor service status

#### Slow Performance

**Possible Causes:**
- High database load
- Cache issues
- Network latency
- Resource constraints

**Solutions:**
1. Check database performance
2. Clear application cache
3. Monitor network connectivity
4. Scale resources if needed

#### Webhook Failures

**Possible Causes:**
- Invalid webhook URLs
- HMAC verification failures
- Network timeouts
- Server errors

**Solutions:**
1. Verify webhook configuration
2. Check HMAC secret
3. Test webhook endpoints
4. Monitor error logs

### Debug Mode

Enable debug mode for detailed logging:

1. Go to Settings > Advanced
2. Enable "Debug Logging"
3. Check logs in the monitoring section
4. Disable when not needed

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 1001 | Invalid API key | Verify API credentials |
| 1002 | Rate limit exceeded | Wait or upgrade plan |
| 1003 | Template error | Check template syntax |
| 1004 | Service unavailable | Check service status |
| 1005 | Database error | Contact support |

## API Reference

### Authentication

All API requests require authentication using your Shopify API credentials.

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     https://your-app.vercel.app/api/settings
```

### Endpoints

#### Get Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "delayThresholdDays": 2,
  "emailEnabled": true,
  "smsEnabled": false,
  "notificationTemplate": "default"
}
```

#### Update Settings
```http
PUT /api/settings
Content-Type: application/json

{
  "delayThresholdDays": 3,
  "emailEnabled": true,
  "smsEnabled": true
}
```

#### Get Alerts
```http
GET /api/alerts?page=1&limit=20
```

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "order_number": "1001",
      "customer_name": "John Doe",
      "delay_days": 3,
      "delay_reason": "weather_delay",
      "email_sent": true,
      "sms_sent": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get Analytics
```http
GET /api/analytics?timeRange=30d
```

**Response:**
```json
{
  "totalOrders": 1000,
  "totalAlerts": 50,
  "alertsBySeverity": {
    "low": 20,
    "medium": 15,
    "high": 10,
    "critical": 5
  },
  "averageDelayDays": 2.5,
  "notificationSuccessRate": {
    "email": 98.5,
    "sms": 95.2
  },
  "revenueImpact": {
    "totalValue": 50000,
    "averageOrderValue": 50,
    "potentialLoss": 5000
  }
}
```

### Webhooks

#### Orders Updated
```http
POST /webhooks/orders/updated
Content-Type: application/json
X-Shopify-Hmac-Sha256: <hmac>

{
  "id": 123456789,
  "order_number": "1001",
  "status": "paid",
  "fulfillments": [...]
}
```

#### Fulfillments Updated
```http
POST /webhooks/fulfillments/updated
Content-Type: application/json
X-Shopify-Hmac-Sha256: <hmac>

{
  "id": 987654321,
  "order_id": 123456789,
  "status": "in_transit",
  "tracking_number": "1Z999AA1234567890"
}
```

## FAQ

### General Questions

**Q: How does DelayGuard detect delays?**
A: DelayGuard monitors tracking information from carriers and compares actual delivery dates with estimated delivery dates. When a delay is detected, it automatically generates an alert.

**Q: Which carriers are supported?**
A: DelayGuard supports 50+ carriers including UPS, FedEx, USPS, DHL, and many others through ShipEngine integration.

**Q: How accurate is the delay detection?**
A: Our system achieves 95%+ accuracy in delay detection by using multiple data sources and advanced algorithms.

**Q: Can I customize notification templates?**
A: Yes, you can create custom email and SMS templates using our template editor with support for dynamic placeholders.

### Technical Questions

**Q: What are the system requirements?**
A: DelayGuard works with any Shopify plan and requires minimal setup. No additional infrastructure is needed.

**Q: How secure is my data?**
A: DelayGuard is SOC 2 Type II certified and uses end-to-end encryption. We never share or sell your data.

**Q: What happens if the service goes down?**
A: DelayGuard has a 99.9% uptime SLA with automatic failover and redundancy built-in.

**Q: Can I integrate with other apps?**
A: Yes, DelayGuard provides a comprehensive API and webhook system for integration with other tools.

### Billing Questions

**Q: How is billing calculated?**
A: Billing is based on the number of orders processed per month. See our pricing page for detailed information.

**Q: Can I change my plan anytime?**
A: Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.

**Q: Is there a free trial?**
A: Yes, we offer a 14-day free trial with full access to all features.

**Q: What payment methods do you accept?**
A: We accept all major credit cards and PayPal.

### Support Questions

**Q: How do I get support?**
A: You can reach us via email, live chat, or through the support portal in your dashboard.

**Q: What are your support hours?**
A: Support is available Monday-Friday 9 AM - 6 PM EST, with extended hours for Enterprise customers.

**Q: Do you offer phone support?**
A: Phone support is available for Pro and Enterprise customers.

**Q: Can I schedule a demo?**
A: Yes, you can schedule a personalized demo through our website or by contacting support.

## Contact Information

**Support Email**: support@delayguard.app
**Sales Email**: sales@delayguard.app
**Website**: https://delayguard.app
**Documentation**: https://help.delayguard.app
**Status Page**: https://status.delayguard.app

**Business Hours:**
- Monday-Friday: 9 AM - 6 PM EST
- Saturday: 10 AM - 2 PM EST
- Sunday: Closed

**Emergency Support:**
- Enterprise customers: 24/7
- Pro customers: Extended hours
- Free customers: Email only
