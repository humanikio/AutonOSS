import { Request, Response } from 'express';
import { firestore } from '../../../config/firebase';

export const updateSystemPromptController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    const { prompt } = req.body;
    
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

    if (prompt === undefined) {
      res.status(400).json({
        success: false,
        error: 'Prompt is required in request body'
      });
      return;
    }

    console.log(`💾 Updating system prompt for agent: ${agentId} (${prompt.length} characters)`);

    // Update the Firestore agent document directly
    const agentRef = firestore
      .collection('tenants').doc(tenantId)
      .collection('agents').doc(agentId);
    
    // Update both the main prompt field and llmSettings.prompt for compatibility
    await agentRef.update({
      prompt: prompt,
      'llmSettings.prompt': prompt,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ System prompt updated successfully in Firestore');

    res.status(200).json({
      success: true,
      message: 'System prompt updated successfully',
      data: {
        promptLength: prompt.length,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error updating system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};