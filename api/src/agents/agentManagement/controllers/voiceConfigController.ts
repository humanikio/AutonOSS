import { Request, Response } from 'express';
import { voiceConfigService } from '../services/voiceConfig';

export const voiceConfigController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    const { action, voiceId, search, pageSize, nextPageToken, voiceType, category } = req.body;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
      return;
    }

    if (!action) {
      res.status(400).json({
        success: false,
        error: 'Action is required'
      });
      return;
    }

    // Handle different voice configuration actions
    const result = await voiceConfigService(tenantId, agentId, {
      action,
      voiceId,
      search,
      pageSize,
      nextPageToken,
      voiceType,
      category
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in voice config controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice configuration request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET endpoint for listing voices (for easier frontend integration)
export const getVoicesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    const { search, pageSize, nextPageToken, voiceType, category } = req.query;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
      return;
    }

    const result = await voiceConfigService(tenantId, agentId, {
      action: 'listVoices',
      search: search as string,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      nextPageToken: nextPageToken as string,
      voiceType: voiceType as string,
      category: category as string
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// GET endpoint for individual voice details
export const getVoiceController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId, voiceId } = req.params;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
      return;
    }

    if (!voiceId) {
      res.status(400).json({
        success: false,
        error: 'Voice ID is required'
      });
      return;
    }

    const result = await voiceConfigService(tenantId, agentId, {
      action: 'getVoice',
      voiceId
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting voice details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voice details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};