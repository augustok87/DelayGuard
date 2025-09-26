import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Basic health check
    if (req.url === '/health' || req.url === '/api/health') {
      res.status(200).json({
        status: 'success',
        message: 'DelayGuard API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
      return;
    }

    // Root endpoint
    if (req.url === '/' || req.url === '/api') {
      res.status(200).json({
        status: 'success',
        message: 'DelayGuard API is running',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          webhooks: '/api/webhooks',
          auth: '/api/auth'
        },
        note: 'This is a backend API. Frontend dashboard coming soon.'
      });
      return;
    }

    // Webhook endpoint placeholder
    if (req.url?.startsWith('/webhooks') || req.url?.startsWith('/api/webhooks')) {
      res.status(200).json({
        status: 'success',
        message: 'Webhook endpoint ready',
        note: 'Webhook processing will be implemented when external services are configured'
      });
      return;
    }

    // Auth endpoint placeholder
    if (req.url?.startsWith('/auth') || req.url?.startsWith('/api/auth')) {
      res.status(200).json({
        status: 'success',
        message: 'Auth endpoint ready',
        note: 'Authentication will be implemented when Shopify credentials are configured'
      });
      return;
    }

    // 404 for unknown routes
    res.status(404).json({
      status: 'error',
      message: 'Endpoint not found',
      availableEndpoints: ['/', '/health', '/webhooks', '/auth']
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}