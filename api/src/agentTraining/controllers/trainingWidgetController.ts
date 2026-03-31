import { Request, Response } from 'express';
import { startTrainingWidgetConversationService } from '../services/startTrainingWidgetConversation';

export const startTrainingWidgetConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { agentId, sessionId } = req.body;

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No tenant ID found'
      });
      return;
    }

    if (!agentId || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: agentId and sessionId'
      });
      return;
    }

    console.log(`[${tenantId}] Starting training widget conversation request:`, {
      agentId,
      sessionId
    });

    const result = await startTrainingWidgetConversationService({
      tenantId,
      agentId,
      sessionId
    });

    res.json({
      success: true,
      data: result
    });
    return;

  } catch (error) {
    console.error('Error in startTrainingWidgetConversation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start training widget conversation'
    });
    return;
  }
};