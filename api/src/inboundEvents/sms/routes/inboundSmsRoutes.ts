import { Router, Request, Response, NextFunction } from 'express';
import { inboundSmsController } from '../controllers/inboundSmsController';

const router = Router();

const debugPayload = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 SMS Route Debug - Request received:');
  console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('🌐 URL:', req.originalUrl);
  console.log('🔑 Method:', req.method);
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * POST /api/inbound-sms/webhook
 * Webhook endpoint for receiving SMS messages from Twilio
 * 
 * This endpoint should be configured in Twilio as the SMS webhook URL
 * for your phone numbers.
 */
router.post(
  '/webhook',
  // Debug payload structure
  debugPayload,
  // Validate Twilio signature for security (skip in dev)
  inboundSmsController.validateTwilioSignature.bind(inboundSmsController),
  // Handle the incoming SMS
  inboundSmsController.handleIncomingSms.bind(inboundSmsController)
);

/**
 * GET /api/inbound-sms/health
 * Health check endpoint for monitoring
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'inbound-sms',
    timestamp: new Date().toISOString()
  });
});

export default router;