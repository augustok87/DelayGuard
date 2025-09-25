// Vercel serverless function entry point
import { app, ensureInitialized } from '../src/server';

export default async (req: any, res: any) => {
  // Ensure database and queues are initialized
  await ensureInitialized();
  
  // Handle the request
  return app.callback()(req, res);
};
