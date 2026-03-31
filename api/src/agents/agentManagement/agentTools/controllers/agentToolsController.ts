import { Request, Response } from 'express';
import { agentToolManager } from '../services/agentToolManager';

/**
 * Create a new agent tool
 * POST /api/agents/:agentId/tools
 */
export const createToolController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { agentId } = req.params;
    const { name, description, workflowId } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
      return;
    }

    const result = await agentToolManager.createTool({
      tenantId,
      agentId,
      name,
      description,
      workflowId,
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error creating agent tool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create agent tool'
    });
  }
};

/**
 * Get a specific agent tool
 * GET /api/agents/:agentId/tools/:toolId
 */
export const getToolController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { agentId, toolId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!agentId || !toolId) {
      res.status(400).json({
        success: false,
        error: 'agentId and toolId are required'
      });
      return;
    }

    const tool = await agentToolManager.readTool({
      tenantId,
      agentId,
      toolId,
    });

    if (!tool) {
      res.status(404).json({
        success: false,
        error: 'Agent tool not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: tool
    });
  } catch (error: any) {
    console.error('Error fetching agent tool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch agent tool'
    });
  }
};

/**
 * Update an agent tool
 * PUT /api/agents/:agentId/tools/:toolId
 */
export const updateToolController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { agentId, toolId } = req.params;
    const { name, description, workflowId } = req.body;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!agentId || !toolId) {
      res.status(400).json({
        success: false,
        error: 'agentId and toolId are required'
      });
      return;
    }

    await agentToolManager.updateTool({
      tenantId,
      agentId,
      toolId,
      name,
      description,
      workflowId,
    });

    res.status(200).json({
      success: true,
      message: 'Agent tool updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating agent tool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update agent tool'
    });
  }
};

/**
 * List all tools for an agent
 * GET /api/agents/:agentId/tools
 */
export const listToolsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { agentId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'agentId is required'
      });
      return;
    }

    const tools = await agentToolManager.listTools({
      tenantId,
      agentId,
    });

    res.status(200).json({
      success: true,
      data: tools
    });
  } catch (error: any) {
    console.error('Error listing agent tools:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list agent tools'
    });
  }
};

/**
 * Delete a tool
 * DELETE /api/agents/:agentId/tools/:toolId
 */
export const deleteToolController = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { agentId, toolId } = req.params;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Authentication required - tenantId not found'
      });
      return;
    }

    if (!agentId || !toolId) {
      res.status(400).json({
        success: false,
        error: 'agentId and toolId are required'
      });
      return;
    }

    await agentToolManager.deleteTool({
      tenantId,
      agentId,
      toolId,
    });

    res.status(200).json({
      success: true,
      message: 'Agent tool deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting agent tool:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete agent tool'
    });
  }
};
