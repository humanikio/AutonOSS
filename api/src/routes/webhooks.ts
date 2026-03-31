import { Router } from 'express';
import { CallAnalyticsController } from '../controllers/callAnalyticsController';

const router = Router();

// Webhooks don't require standard auth - they use webhook signatures
router.post('/ghl/sms', (req, res) => {
  res.json({
    success: true,
    message: 'GHL SMS webhook - Coming soon',
    timestamp: new Date().toISOString()
  });
});

// ElevenLabs post-call webhook endpoint
// URL format: /api/webhooks/elevenlabs/call?tenantId=TENANT_ID
router.post('/elevenlabs/call', CallAnalyticsController.handleWebhook);

export default router;