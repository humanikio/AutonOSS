import { Request, Response } from 'express';
import { createAgentService } from '../services/createAgent';
import { getAgentsService } from '../services/getAgents';
import { deleteAgentService } from '../services/deleteAgent';
import { manageAgentService } from '../services/manageAgent';
import { refreshAgent } from '../services/refreshAgent';
import { updateAgentConfig } from '../services/updateAgentConfig';
import { updateAgentKbDocs } from '../services/updateAgentKbDocs';
import { systemPromptService } from '../services/systemPromptService';
import { agentPromptMigration } from '../services/migrateAgentPrompts';

export const getAgentsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    const agents = await getAgentsService(tenantId);

    res.status(200).json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createAgentController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get tenantId from authenticated user
    const tenantId = req.tenantId || req.user?.tenantId;
    
    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: No tenant ID found'
      });
      return;
    }

    // Get agent name and selected avatar from request body
    const { name, selectedAvatar } = req.body;
    
    if (!name || !name.trim()) {
      res.status(400).json({
        success: false,
        error: 'Agent name is required'
      });
      return;
    }

    // Validate selectedAvatar if provided
    if (selectedAvatar && (!selectedAvatar.color || !selectedAvatar.entityImagePath || !selectedAvatar.iconImagePath)) {
      res.status(400).json({
        success: false,
        error: 'Invalid avatar data. Must include color, entityImagePath, and iconImagePath.'
      });
      return;
    }

    // Create the agent using the service
    const agentId = await createAgentService(tenantId, name.trim(), selectedAvatar);

    res.status(201).json({
      success: true,
      data: {
        agentId,
        message: 'Agent created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteAgentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    
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

    // Delete the agent using the service
    await deleteAgentService(tenantId, agentId);

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const manageAgentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    const { action, name, phoneNumber, twilioSid, email, emailId, channelType, enabled, status } = req.body;
    
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

    // Handle different management actions
    if (action === 'updateName') {
      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Name is required for updateName action'
        });
        return;
      }

      await manageAgentService(tenantId, agentId, {
        action: 'updateName',
        name
      });

      res.status(200).json({
        success: true,
        message: 'Agent name updated successfully'
      });
    } else if (action === 'updatePhoneNumber') {
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required for updatePhoneNumber action'
        });
        return;
      }

      await manageAgentService(tenantId, agentId, {
        action: 'updatePhoneNumber',
        phoneNumber,
        twilioSid
      });

      res.status(200).json({
        success: true,
        message: 'Agent phone number updated successfully'
      });
    } else if (action === 'updateEmail') {
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required for updateEmail action'
        });
        return;
      }

      await manageAgentService(tenantId, agentId, {
        action: 'updateEmail',
        email,
        emailId
      });

      res.status(200).json({
        success: true,
        message: 'Agent email updated successfully'
      });
    } else if (action === 'updateEnabledChannels') {
      if (!channelType || enabled === undefined) {
        res.status(400).json({
          success: false,
          error: 'channelType and enabled are required for updateEnabledChannels action'
        });
        return;
      }

      await manageAgentService(tenantId, agentId, {
        action: 'updateEnabledChannels',
        channelType,
        enabled
      });

      res.status(200).json({
        success: true,
        message: `Channel ${channelType} ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } else if (action === 'updateStatus') {
      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Status is required for updateStatus action'
        });
        return;
      }

      if (!['active', 'draft', 'paused'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status must be one of: active, draft, paused'
        });
        return;
      }

      await manageAgentService(tenantId, agentId, {
        action: 'updateStatus',
        status
      });

      res.status(200).json({
        success: true,
        message: `Agent status updated to ${status} successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action specified'
      });
    }
  } catch (error) {
    console.error('Error managing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to manage agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const refreshAgentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    
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

    // Get the 11Labs agent ID from the request - could be in body or get from Firestore
    const { elevenLabsAgentId } = req.body;
    
    if (!elevenLabsAgentId) {
      res.status(400).json({
        success: false,
        error: 'ElevenLabs agent ID is required in request body'
      });
      return;
    }

    console.log(`🔄 Refresh request for agent: ${agentId} (11Labs: ${elevenLabsAgentId})`);

    // Call the refresh service
    const result = await refreshAgent({
      tenantId,
      agentId,
      elevenLabsAgentId
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          updatedFields: result.updatedFields,
          elevenLabsAgentId: result.elevenLabsAgentId,
          elevenLabsAgentName: result.elevenLabsAgentName
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        elevenLabsAgentId: result.elevenLabsAgentId
      });
    }
  } catch (error) {
    console.error('Error refreshing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh agent configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateAgentConfigController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    
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

    // Get the 11Labs agent ID and updates from the request body
    const { elevenLabsAgentId, updates } = req.body;
    
    if (!elevenLabsAgentId) {
      res.status(400).json({
        success: false,
        error: 'ElevenLabs agent ID is required in request body'
      });
      return;
    }

    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'Configuration updates are required'
      });
      return;
    }

    console.log(`🔄 Configuration update request for agent: ${agentId} (11Labs: ${elevenLabsAgentId})`);
    console.log('📋 Updates:', JSON.stringify(updates, null, 2));

    // Call the update service
    const result = await updateAgentConfig({
      tenantId,
      agentId,
      elevenLabsAgentId,
      updates
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          updatedFields: result.updatedFields,
          elevenLabsAgentId: result.elevenLabsAgentId,
          elevenLabsAgentName: result.elevenLabsAgentName
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        elevenLabsAgentId: result.elevenLabsAgentId
      });
    }
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateAgentKnowledgeBaseController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    const { documentIds, action } = req.body;
    
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

    if (!documentIds || !Array.isArray(documentIds)) {
      res.status(400).json({
        success: false,
        error: 'Document IDs array is required'
      });
      return;
    }

    if (!action || !['add', 'remove', 'replace'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Action must be one of: add, remove, replace'
      });
      return;
    }

    console.log(`📚 Knowledge base update request for agent ${agentId}: ${action} action with ${documentIds.length} documents`);

    // Call the service to update agent knowledge base
    const result = await updateAgentKbDocs({
      tenantId,
      agentId,
      documentIds,
      action
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          attachedDocuments: result.attachedDocuments,
          removedDocuments: result.removedDocuments
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        details: result.error
      });
    }
  } catch (error) {
    console.error('Error updating agent knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent knowledge base',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// NEW: System prompt management controllers

export const getSystemPromptController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { agentId } = req.params;
    
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

    console.log(`📋 Fetching system prompt for agent: ${agentId}`);

    // Check if agent needs migration first
    const migrationStatus = await agentPromptMigration.getAgentMigrationStatus(tenantId, agentId);
    
    if (migrationStatus.needsMigration) {
      console.log(`🔄 Auto-migrating prompt for agent: ${agentId}`);
      await agentPromptMigration.migrateAgentPrompt(tenantId, agentId);
    }

    // Get the internal system prompt
    const systemPrompt = await systemPromptService.getSystemPrompt(tenantId, agentId);

    res.status(200).json({
      success: true,
      data: {
        systemPrompt,
        migrationStatus
      }
    });

  } catch (error) {
    console.error('Error fetching system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

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

    // Update the internal system prompt
    await systemPromptService.updateSystemPrompt(tenantId, agentId, prompt, req.user?.email || 'api');

    res.status(200).json({
      success: true,
      message: 'System prompt updated successfully',
      data: {
        promptLength: prompt.length,
        updatedBy: req.user?.email || 'api',
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system prompt',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};