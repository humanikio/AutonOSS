import { Router, Request, Response, NextFunction } from 'express';
import { agentWebhookHandlerController } from '../controllers/agentWebhookHandlerController';

const router = Router();

// Debug middleware to log incoming universal webhook requests
const debugUniversalWebhook = (req: Request, res: Response, next: NextFunction) => {
  console.log('< Universal Webhook Handler - Request received:');
  console.log('=á Headers:', JSON.stringify(req.headers, null, 2));
  console.log('=æ Body:', JSON.stringify(req.body, null, 2));
  console.log('< URL:', req.originalUrl);
  console.log('= Method:', req.method);
  console.log('=Ê Params:', JSON.stringify(req.params, null, 2));
  console.log('ð Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * POST /api/universal-message/:encodedData
 * Universal webhook endpoint for processing encoded agent webhook requests
 * 
 * The encodedData parameter contains base64-encoded JSON with:
 * {
 *   tenantId: string;
 *   agentId: string;
 *   channel: string;  // 'sms', 'email', 'phone'
 *   method: string;   // 'inbound', 'outbound'
 * }
 * 
 * This endpoint decodes the webhook context and routes to appropriate handlers
 */
router.post(
  '/:encodedData',
  debugUniversalWebhook,
  agentWebhookHandlerController.handleUniversalWebhook.bind(agentWebhookHandlerController)
);

/**
 * GET /api/universal-message/health
 * Health check endpoint for monitoring
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'universal-webhook-handler',
    timestamp: new Date().toISOString()
  });
});

export default router;