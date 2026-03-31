import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { getAgentWebhooks } from '../utils/saveAgentWebhookFirestore';

const router = Router();

// Get all webhooks for an agent
router.get('/:agentId/webhooks', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { tenantId } = req.query;

    if (!agentId || !tenantId) {
      return res.status(400).json({
        error: 'Missing required parameters: agentId and tenantId are required'
      });
    }

    const webhooks = await getAgentWebhooks(tenantId as string, agentId);

    return res.status(200).json({
      success: true,
      webhooks
    });
  } catch (error) {
    console.error('Error fetching agent webhooks:', error);
    return res.status(500).json({
      error: 'Failed to fetch agent webhooks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as agentWebhookGetRoutes };