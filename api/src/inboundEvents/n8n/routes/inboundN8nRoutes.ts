import { Router } from 'express';
import { inboundN8nController } from '../controllers/inboundN8nController';

const router = Router();

/**
 * POST /api/inbound-n8n/execution-hooks
 * Receives execution metadata from n8n workflows
 *
 * Posted by injected HTTP Request node when workflow reaches wait node
 * Requires API key authentication (handled by authenticateEither middleware)
 */
router.post(
  '/execution-hooks',
  inboundN8nController.handleExecutionHook
);

/**
 * GET /api/inbound-n8n/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'inbound-n8n',
    timestamp: new Date().toISOString()
  });
});

export default router;
