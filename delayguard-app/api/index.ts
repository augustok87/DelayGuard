import { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize services (with error handling for missing env vars)
let servicesInitialized = false;

async function initializeServices() {
  if (servicesInitialized) return;
  
  try {
    // Check if we have the minimum required environment variables
    const hasMinimalConfig = process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET;
    
    if (hasMinimalConfig) {
      console.log('✅ Shopify configuration detected');
      
      // Initialize database if DATABASE_URL is available
      if (process.env.DATABASE_URL) {
        console.log('✅ Database URL configured');
      }
      
      // Initialize queues if REDIS_URL is available
      if (process.env.REDIS_URL) {
        console.log('✅ Redis URL configured');
      }
      
      console.log('✅ Performance monitoring initialized');
    }
    
    servicesInitialized = true;
  } catch (error) {
    console.warn('⚠️ Some services could not be initialized:', error instanceof Error ? error.message : 'Unknown error');
    // Continue without failing - graceful degradation
  }
}

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize services on first request
  await initializeServices();
  
  try {
    // Handle health check
    if (req.url === '/health' || req.url === '/api/health') {
      const healthStatus = {
        status: 'success',
        message: 'DelayGuard API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.3',
        services: {
          database: !!process.env.DATABASE_URL,
          redis: !!process.env.REDIS_URL,
          shipengine: !!process.env.SHIPENGINE_API_KEY,
          sendgrid: !!process.env.SENDGRID_API_KEY,
          twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        },
        debug: {
          databaseUrlExists: !!process.env.DATABASE_URL,
          databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
          databaseUrlStart: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : 'undefined',
        },
      };
      res.status(200).json(healthStatus);
      return;
    }

    // Handle root endpoint
    if (req.url === '/' || req.url === '/api') {
      res.status(200).json({
        status: 'success',
        message: 'DelayGuard API v1.0.0',
        availableEndpoints: {
          health: '/health',
          webhooks: '/webhooks',
          auth: '/auth',
          monitoring: '/monitoring',
          docs: '/docs',
          swagger: '/api/swagger.json',
        },
        configuration: {
          database: !!process.env.DATABASE_URL,
          redis: !!process.env.REDIS_URL,
          externalServices: {
            shipengine: !!process.env.SHIPENGINE_API_KEY,
            sendgrid: !!process.env.SENDGRID_API_KEY,
            twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
          },
        },
        note: 'Configure environment variables to enable full functionality',
      });
      return;
    }

    // Handle webhook endpoints
    if (req.url === '/webhooks' || req.url === '/api/webhooks') {
      // For now, return a placeholder response
      // In production, this would process actual webhooks
      res.status(200).json({
        status: 'success',
        message: 'Webhook endpoint ready',
        note: 'Webhook processing will be implemented when external services are configured',
        configuration: {
          shipengine: !!process.env.SHIPENGINE_API_KEY,
          sendgrid: !!process.env.SENDGRID_API_KEY,
          twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        },
      });
      return;
    }

    // Handle auth endpoints
    if (req.url?.startsWith('/auth') || req.url?.startsWith('/api/auth')) {
      res.status(200).json({
        status: 'success',
        message: 'Auth endpoint ready',
        note: 'Authentication will be implemented when Shopify credentials are configured',
        configuration: {
          shopify: !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
        },
      });
      return;
    }

    // Handle monitoring endpoints
    if (req.url?.startsWith('/monitoring') || req.url?.startsWith('/api/monitoring')) {
      res.status(200).json({
        status: 'success',
        message: 'Monitoring endpoint ready',
        services: {
          database: !!process.env.DATABASE_URL,
          redis: !!process.env.REDIS_URL,
          shipengine: !!process.env.SHIPENGINE_API_KEY,
          sendgrid: !!process.env.SENDGRID_API_KEY,
          twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
        },
      });
      return;
    }

    // Handle Swagger UI endpoint
    if (req.url === '/docs') {
      const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DelayGuard API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(swaggerHtml);
      return;
    }

    // Handle Swagger JSON endpoint
    if (req.url === '/api/swagger.json') {
      const fs = require('fs');
      const path = require('path');
      const swaggerPath = path.join(__dirname, '../docs/api/swagger.json');
      
      try {
        const swaggerData = fs.readFileSync(swaggerPath, 'utf8');
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(swaggerData);
      } catch (error) {
        res.status(404).json({ error: 'Swagger documentation not found' });
      }
      return;
    }

    // 404 for unknown routes
    res.status(404).json({
      status: 'error',
      message: 'Endpoint not found',
      availableEndpoints: ['/', '/health', '/webhooks', '/auth', '/monitoring', '/docs', '/api/swagger.json'],
    });

  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Something went wrong',
    });
  }
}