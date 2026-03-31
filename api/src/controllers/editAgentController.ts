import { Request, Response } from 'express';
import { EditAgentService } from '../services/editAgentService';

export class EditAgentController {
  static async updateBasicInfo(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;
      const { name, description, status } = req.body;

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isOwner = await EditAgentService.validateAgentOwnership(tenantId, agentId);
      if (!isOwner) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      await EditAgentService.updateBasicInfo(tenantId, agentId, {
        name,
        description,
        status
      });

      res.json({ message: 'Basic information updated successfully' });
    } catch (error) {
      console.error('Error updating agent basic info:', error);
      res.status(500).json({ error: 'Failed to update agent basic information' });
    }
  }

  static async updateVoiceSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;
      const { voiceId, stability, similarityBoost, style, useSpeakerBoost } = req.body;

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isOwner = await EditAgentService.validateAgentOwnership(tenantId, agentId);
      if (!isOwner) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      await EditAgentService.updateVoiceSettings(tenantId, agentId, {
        voiceId,
        stability,
        similarityBoost,
        style,
        useSpeakerBoost
      });

      res.json({ message: 'Voice settings updated successfully' });
    } catch (error) {
      console.error('Error updating agent voice settings:', error);
      res.status(500).json({ error: 'Failed to update agent voice settings' });
    }
  }

  static async updateConversationSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;
      const { systemPrompt, firstMessage, language } = req.body;

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isOwner = await EditAgentService.validateAgentOwnership(tenantId, agentId);
      if (!isOwner) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      await EditAgentService.updateConversationSettings(tenantId, agentId, {
        systemPrompt,
        firstMessage,
        language
      });

      res.json({ message: 'Conversation settings updated successfully' });
    } catch (error) {
      console.error('Error updating agent conversation settings:', error);
      res.status(500).json({ error: 'Failed to update agent conversation settings' });
    }
  }

  static async updateBehaviorSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;
      const { responseLength, interruptionSensitivity, systemToolIds, customToolIds } = req.body;
      
      console.log('📋 Behavior settings received:', {
        responseLength,
        interruptionSensitivity,
        systemToolIds,
        customToolIds
      });

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isOwner = await EditAgentService.validateAgentOwnership(tenantId, agentId);
      if (!isOwner) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      await EditAgentService.updateBehaviorSettings(tenantId, agentId, {
        responseLength,
        interruptionSensitivity,
        systemToolIds,
        customToolIds
      });

      res.json({ message: 'Behavior settings updated successfully' });
    } catch (error) {
      console.error('Error updating agent behavior settings:', error);
      res.status(500).json({ error: 'Failed to update agent behavior settings' });
    }
  }

  static async updateKnowledgeBase(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;
      const knowledgeData = req.body;

      console.log('Raw knowledge data received:', JSON.stringify(knowledgeData, null, 2));

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isOwner = await EditAgentService.validateAgentOwnership(tenantId, agentId);
      if (!isOwner) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      // Extract knowledge base IDs from elevenlabsKnowledgeBases array
      let knowledgeBaseIds: string[] = [];
      
      // Handle both old format (direct knowledgeBaseIds) and new format (elevenlabsKnowledgeBases)
      if (knowledgeData.knowledgeBaseIds) {
        knowledgeBaseIds = knowledgeData.knowledgeBaseIds;
      } else if (knowledgeData.elevenlabsKnowledgeBases && Array.isArray(knowledgeData.elevenlabsKnowledgeBases)) {
        knowledgeBaseIds = knowledgeData.elevenlabsKnowledgeBases
          .filter((kb: any) => kb.id) // Only include items with valid IDs
          .map((kb: any) => kb.id);
      }

      console.log('Updating knowledge base with IDs:', knowledgeBaseIds);

      await EditAgentService.updateKnowledgeBase(tenantId, agentId, knowledgeData);

      res.json({ 
        message: 'Knowledge base updated successfully',
        knowledgeBaseIds 
      });
    } catch (error) {
      console.error('Error updating agent knowledge base:', error);
      res.status(500).json({ error: 'Failed to update agent knowledge base' });
    }
  }

  static async getAgentForEdit(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { agentId } = req.params;

      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const agent = await EditAgentService.getAgentForEdit(tenantId, agentId);
      
      if (!agent) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }

      res.json(agent);
    } catch (error) {
      console.error('Error getting agent for edit:', error);
      res.status(500).json({ error: 'Failed to get agent for editing' });
    }
  }
}