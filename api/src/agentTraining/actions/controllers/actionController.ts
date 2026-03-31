import { Request, Response } from 'express';
import { createNewActionService } from '../services/CRUD/createNewAction';
import { getActionService } from '../services/CRUD/getAction';
import { updateActionService } from '../services/CRUD/updateAction';
import { deleteActionService } from '../services/CRUD/deleteAction';
import { getAgentActionsService } from '../services/CRUD/getAgentActions';

export const actionController = {
  // POST /api/agent-training/actions
  createAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        agentId,
        name,
        description,
        type,
        prompt,
        understanding,
        postActionConfig,
        isActive
      } = req.body;

      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      // Validate required fields - only agentId is required for creating a new blank action
      if (!agentId) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: agentId is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate type
      const validTypes = ['nurture', 'support', 'followup', 'custom'];
      if (type && !validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid action type. Must be one of: ${validTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Create the action with defaults for new blank actions
      const actionResult = await createNewActionService({
        agentId,
        tenantId,
        userId,
        name: name || 'New Action',
        description: description || 'A new custom action',
        type: type || 'custom',
        prompt: prompt || '',
        understanding: understanding || {
          summary: '',
          behavior: '',
          tone: '',
          keyPoints: [],
          confidence: 0
        },
        postActionConfig,
        isActive: isActive !== undefined ? isActive : false
      });

      res.status(201).json({
        success: true,
        data: actionResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('L Error in createAction controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/actions/:actionId
  getAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const action = await getActionService(actionId, tenantId);

      res.status(200).json({
        success: true,
        data: action,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('L Error in getAction controller:', error);
      
      if (error instanceof Error && error.message === 'Action not found') {
        res.status(404).json({
          success: false,
          error: 'Action not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // PUT /api/agent-training/actions/:actionId
  updateAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const updateData = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const updatedAction = await updateActionService(actionId, tenantId, userId, updateData);

      res.status(200).json({
        success: true,
        data: updatedAction,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('L Error in updateAction controller:', error);
      
      if (error instanceof Error && error.message === 'Action not found') {
        res.status(404).json({
          success: false,
          error: 'Action not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // DELETE /api/agent-training/actions/:actionId
  deleteAction: async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      await deleteActionService(actionId, tenantId);

      res.status(200).json({
        success: true,
        message: 'Action deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('L Error in deleteAction controller:', error);
      
      if (error instanceof Error && error.message === 'Action not found') {
        res.status(404).json({
          success: false,
          error: 'Action not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete action',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/agent-training/agents/:agentId/actions
  getAgentActions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const actions = await getAgentActionsService(agentId, tenantId);

      res.status(200).json({
        success: true,
        data: {
          agentId,
          actions
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('L Error in getAgentActions controller:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve agent actions',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
};