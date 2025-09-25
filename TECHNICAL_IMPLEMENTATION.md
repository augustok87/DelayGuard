# DelayGuard Technical Implementation Guide

## Overview
DelayGuard is a Shopify app that proactively detects shipping delays via carrier APIs and alerts customers, reducing support tickets by 20-40%. This document covers the complete technical implementation strategy, architecture, and development guidelines.

## System Architecture

### High-Level Architecture
```mermaid
graph TD
    A[Shopify Webhook] -->|orders/updated| B[Express Webhook Endpoint]
    B -->|Validate HMAC| C[BullMQ Queue]
    C -->|Delayed Job| D[Carrier API Fetch (ShipEngine)]
    D -->|Check Status| E{Is Delayed?}
    E -->|Yes| F[SendGrid Email/SMS]
    E -->|No| G[Log & End]
    H[Shopify Admin API] <-->|GraphQL Queries| D
    I[Admin Dashboard (React)] <-->|App Bridge| B
    J[Redis (Upstash)] <--> C
    subgraph Hosting
    B
    C
    I
    end
```

### Architecture Style
- **Pattern**: Serverless monolith for MVP, with queued async processing
- **Key Components**: Shopify webhook ingress, delay detection logic, notification sender
- **Data Flow**: Webhook → Queue → API Poll → Alert if delayed
- **Scalability**: Handles 10K+ stores via serverless hosting
- **Security**: HMAC verification, encrypted tokens

## Technology Stack (2024 Updated)

### Backend
- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js 4.18+
- **Queue System**: BullMQ with Redis (Upstash)
- **Database**: PostgreSQL (Supabase) for production, SQLite for development

### Frontend
- **Framework**: React 18+ with TypeScript
- **UI Library**: Shopify Polaris 12+
- **State Management**: Zustand (lightweight alternative to Redux)
- **Styling**: Polaris components + CSS modules

### APIs & Integrations
- **Shopify**: GraphQL Admin API, Webhooks, App Bridge
- **Carriers**: ShipEngine API (unified carrier integration)
- **Notifications**: SendGrid (email), Twilio (SMS)
- **Monitoring**: Sentry (error tracking), Vercel Analytics

### Hosting & Infrastructure
- **Primary**: Vercel (serverless functions)
- **Database**: Supabase (PostgreSQL)
- **Queue**: Upstash Redis
- **CDN**: Vercel Edge Network
- **Monitoring**: Vercel Analytics + Sentry

## Development Setup

### Prerequisites
```bash
# Install Node.js 20+ LTS
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install Shopify CLI
npm install -g @shopify/cli@latest

# Install additional tools
npm install -g @shopify/theme@latest
```

### Project Initialization
```bash
# Create new Shopify app
shopify app init --template=node

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables
```env
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_orders,write_orders,read_fulfillments,write_fulfillments

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Queue
REDIS_URL=redis://user:password@host:port

# External APIs
SHIPENGINE_API_KEY=your_shipengine_key
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Local Development
```bash
# Start development server
shopify app dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## API Integrations

### Shopify Integration

#### Authentication
```javascript
// OAuth 2.0 with App Bridge
import { authenticate } from "@shopify/koa-shopify-auth";

app.use(authenticate({
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecret: process.env.SHOPIFY_API_SECRET,
    scopes: process.env.SHOPIFY_SCOPES.split(','),
    afterAuth: async (ctx) => {
      // Store shop info and redirect to app
    }
  }
}));
```

#### Webhooks
```javascript
// Subscribe to order and fulfillment updates
const webhookTopics = [
  'orders/updated',
  'fulfillments/updated',
  'orders/paid'
];

// Webhook handler with HMAC verification
app.post('/webhooks/orders/updated', async (ctx) => {
  const hmac = ctx.get('X-Shopify-Hmac-Sha256');
  const body = ctx.request.rawBody;
  
  if (!verifyWebhook(body, hmac)) {
    ctx.status = 401;
    return;
  }
  
  // Process order update
  await processOrderUpdate(ctx.request.body);
  ctx.status = 200;
});
```

#### GraphQL Queries
```javascript
// Fetch order with fulfillment tracking
const ORDER_QUERY = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      email
      fulfillments {
        id
        trackingInfo {
          number
          company
        }
        status
        createdAt
      }
    }
  }
`;

// Fetch tracking info
const TRACKING_QUERY = `
  query getFulfillment($id: ID!) {
    fulfillment(id: $id) {
      trackingInfo {
        number
        company
        url
      }
    }
  }
`;
```

### Carrier Integration (ShipEngine)

#### Setup
```javascript
// ShipEngine API client
import { ShipEngine } from 'shipengine';

const shipEngine = new ShipEngine({
  apiKey: process.env.SHIPENGINE_API_KEY,
  baseUrl: 'https://api.shipengine.com'
});
```

#### Tracking Implementation
```javascript
// Track package and detect delays
async function checkForDelays(trackingNumber, carrierCode) {
  try {
    const tracking = await shipEngine.trackPackage({
      trackingNumber,
      carrierCode
    });
    
    // Check for delay indicators
    const isDelayed = tracking.status === 'DELAYED' || 
                     tracking.status === 'EXCEPTION' ||
                     (tracking.estimatedDeliveryDate && 
                      new Date(tracking.estimatedDeliveryDate) > new Date(tracking.originalEstimatedDeliveryDate));
    
    return {
      isDelayed,
      status: tracking.status,
      estimatedDelivery: tracking.estimatedDeliveryDate,
      originalDelivery: tracking.originalEstimatedDeliveryDate,
      events: tracking.events
    };
  } catch (error) {
    console.error('Tracking error:', error);
    return { isDelayed: false, error: error.message };
  }
}
```

### Notification Services

#### Email (SendGrid)
```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendDelayEmail(customerEmail, orderInfo, delayDetails) {
  const msg = {
    to: customerEmail,
    from: 'noreply@delayguard.app',
    templateId: 'd-delay-notification-template',
    dynamicTemplateData: {
      customerName: orderInfo.customerName,
      orderNumber: orderInfo.orderNumber,
      newDeliveryDate: delayDetails.estimatedDelivery,
      trackingNumber: delayDetails.trackingNumber,
      trackingUrl: delayDetails.trackingUrl
    }
  };
  
  await sgMail.send(msg);
}
```

#### SMS (Twilio)
```javascript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendDelaySMS(phoneNumber, orderInfo, delayDetails) {
  const message = await client.messages.create({
    body: `Hi ${orderInfo.customerName}, your order #${orderInfo.orderNumber} is delayed. New delivery: ${delayDetails.estimatedDelivery}. Track: ${delayDetails.trackingUrl}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
  
  return message.sid;
}
```

## Queue System Implementation

### BullMQ Setup
```javascript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);

// Create queues
const delayCheckQueue = new Queue('delay-check', { connection });
const notificationQueue = new Queue('notifications', { connection });

// Process delay checks
const delayWorker = new Worker('delay-check', async (job) => {
  const { orderId, trackingNumber, carrierCode } = job.data;
  
  const delayResult = await checkForDelays(trackingNumber, carrierCode);
  
  if (delayResult.isDelayed) {
    await notificationQueue.add('send-delay-alert', {
      orderId,
      delayDetails: delayResult
    });
  }
}, { connection });

// Process notifications
const notificationWorker = new Worker('notifications', async (job) => {
  const { orderId, delayDetails } = job.data;
  
  // Fetch order details
  const order = await getOrderDetails(orderId);
  
  // Send notifications based on customer preferences
  if (order.customerEmail) {
    await sendDelayEmail(order.customerEmail, order, delayDetails);
  }
  
  if (order.customerPhone) {
    await sendDelaySMS(order.customerPhone, order, delayDetails);
  }
}, { connection });
```

## Frontend Implementation

### React Components with Polaris
```jsx
import React from 'react';
import {
  Page,
  Card,
  DataTable,
  Button,
  Badge,
  TextField,
  Select
} from '@shopify/polaris';

function DelayGuardDashboard() {
  const [settings, setSettings] = useState({
    delayThreshold: 2,
    emailEnabled: true,
    smsEnabled: false,
    notificationTemplate: 'default'
  });

  return (
    <Page title="DelayGuard Settings">
      <Card>
        <Card.Section>
          <TextField
            label="Delay Threshold (days)"
            value={settings.delayThreshold}
            onChange={(value) => setSettings({...settings, delayThreshold: value})}
            type="number"
          />
        </Card.Section>
        
        <Card.Section>
          <Select
            label="Notification Template"
            options={[
              {label: 'Default', value: 'default'},
              {label: 'Friendly', value: 'friendly'},
              {label: 'Professional', value: 'professional'}
            ]}
            value={settings.notificationTemplate}
            onChange={(value) => setSettings({...settings, notificationTemplate: value})}
          />
        </Card.Section>
      </Card>
      
      <Card>
        <Card.Section>
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text']}
            headings={['Order', 'Customer', 'Status', 'Actions']}
            rows={delayAlerts}
          />
        </Card.Section>
      </Card>
    </Page>
  );
}
```

## Performance Optimization

### Caching Strategy
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache tracking data to reduce API calls
async function getCachedTracking(trackingNumber) {
  const cached = await redis.get(`tracking:${trackingNumber}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const tracking = await checkForDelays(trackingNumber);
  await redis.setex(`tracking:${trackingNumber}`, 3600, JSON.stringify(tracking));
  return tracking;
}
```

### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

// Rate limit webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many webhook requests'
});

app.use('/webhooks', webhookLimiter);
```

## Security Implementation

### HMAC Verification
```javascript
import crypto from 'crypto';

function verifyWebhook(data, hmac) {
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(data, 'utf8')
    .digest('base64');
  
  return hash === hmac;
}
```

### Environment Security
```javascript
// Validate required environment variables
const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'DATABASE_URL',
  'REDIS_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## Testing Strategy

### Unit Tests
```javascript
// Jest test example
describe('Delay Detection', () => {
  test('should detect delay when estimated delivery is past original', () => {
    const tracking = {
      status: 'IN_TRANSIT',
      estimatedDeliveryDate: '2024-02-15',
      originalEstimatedDeliveryDate: '2024-02-10'
    };
    
    const result = checkForDelays(tracking);
    expect(result.isDelayed).toBe(true);
  });
});
```

### Integration Tests
```javascript
// Test webhook processing
describe('Webhook Processing', () => {
  test('should process order update webhook', async () => {
    const webhookData = {
      id: 12345,
      fulfillments: [{
        tracking_number: '1Z999AA1234567890',
        tracking_company: 'ups'
      }]
    };
    
    const result = await processOrderUpdate(webhookData);
    expect(result).toBeDefined();
  });
});
```

## Deployment Configuration

### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/webhooks/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment-Specific Configuration
```javascript
// config/index.js
const config = {
  development: {
    database: {
      url: process.env.DATABASE_URL || 'sqlite:./dev.db'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    }
  },
  production: {
    database: {
      url: process.env.DATABASE_URL
    },
    redis: {
      url: process.env.REDIS_URL
    }
  }
};

export default config[process.env.NODE_ENV || 'development'];
```

## Monitoring & Analytics

### Error Tracking
```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// Error handling middleware
app.use((error, req, res, next) => {
  Sentry.captureException(error);
  res.status(500).json({ error: 'Internal server error' });
});
```

### Performance Monitoring
```javascript
// Custom metrics
const metrics = {
  webhooksProcessed: 0,
  delaysDetected: 0,
  notificationsSent: 0
};

// Track webhook processing
app.use('/webhooks', (req, res, next) => {
  metrics.webhooksProcessed++;
  next();
});
```

## Best Practices Summary

1. **API Optimization**: Use GraphQL for efficient data fetching, implement proper rate limiting
2. **Performance**: Cache frequently accessed data, minimize external API calls
3. **Security**: Always verify webhooks, use environment variables for secrets
4. **Error Handling**: Implement comprehensive error handling and logging
5. **Testing**: Write unit and integration tests for critical functionality
6. **Monitoring**: Set up error tracking and performance monitoring
7. **Scalability**: Use queues for async processing, implement proper caching strategies

This technical implementation guide provides a solid foundation for building a robust, scalable DelayGuard Shopify app that follows current best practices and industry standards.
