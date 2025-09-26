import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'success',
    message: 'DelayGuard API v1.0.1',
    availableEndpoints: {
      health: '/health',
      webhooks: '/webhooks',
      auth: '/auth',
      monitoring: '/monitoring'
    },
    configuration: {
      database: !!process.env.DATABASE_URL,
      redis: !!process.env.REDIS_URL,
      externalServices: {
        shipengine: !!process.env.SHIPENGINE_API_KEY,
        sendgrid: !!process.env.SENDGRID_API_KEY,
        twilio: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      }
    },
    note: 'Configure environment variables to enable full functionality'
  });
}
