/**
 * Node Registry Controller
 * Handles API requests for node registry
 */

import { Request, Response } from 'express';
import { NodeRegistry } from '../services/nodeRegistry';

/**
 * GET /api/workflows/nodes
 * Get all available nodes
 */
export const getAllNodesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const nodes = NodeRegistry.getAllNodes();

    res.status(200).json({
      success: true,
      data: nodes,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch nodes',
    });
  }
};

/**
 * GET /api/workflows/nodes/:nodeName
 * Get full configuration for a specific node
 */
export const getNodeConfigController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nodeName } = req.params;

    const config = NodeRegistry.getNodeConfig(nodeName);

    if (!config) {
      res.status(404).json({
        success: false,
        error: `Node "${nodeName}" not found in registry`,
      });
      return;
    }

    // Debug logging for Create Contact node
    if (nodeName === 'pulselineCreateContact' || nodeName === 'pulselineUpdateContact') {
      console.log(`📋 Returning node config for ${nodeName}:`);
      console.log(`   Has _pulseline:`, !!config._pulseline);
      console.log(`   Has loadOptionsMethods:`, !!config._pulseline?.loadOptionsMethods);
      console.log(`   loadOptionsMethods keys:`, config._pulseline?.loadOptionsMethods ? Object.keys(config._pulseline.loadOptionsMethods) : 'none');
      console.log(`   Full _pulseline:`, JSON.stringify(config._pulseline, null, 2));
    }

    // Disable caching for node configs during development
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch node configuration',
    });
  }
};

/**
 * GET /api/workflows/nodes/category/:category
 * Get nodes filtered by category (trigger, action, condition)
 */
export const getNodesByCategoryController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category } = req.params as { category: 'trigger' | 'action' | 'condition' };

    // Validate category
    if (!['trigger', 'action', 'condition'].includes(category)) {
      res.status(400).json({
        success: false,
        error: 'Invalid category. Must be "trigger", "action", or "condition"',
      });
      return;
    }

    const nodes = NodeRegistry.getNodesByCategory(category);

    res.status(200).json({
      success: true,
      data: nodes,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch nodes by category',
    });
  }
};

/**
 * GET /api/workflows/nodes/stats
 * Get statistics about available nodes
 */
export const getNodeStatsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = NodeRegistry.getNodeStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch node statistics',
    });
  }
};

/**
 * POST /api/workflows/nodes/:nodeName/create-instance
 * Create a new node instance with default values
 */
export const createNodeInstanceController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { nodeName } = req.params;
    const { position, customName } = req.body;

    // Validate position
    if (!position || !Array.isArray(position) || position.length !== 2) {
      res.status(400).json({
        success: false,
        error: 'Position must be an array of [x, y] coordinates',
      });
      return;
    }

    const nodeInstance = NodeRegistry.createNodeInstance(
      nodeName,
      position as [number, number],
      customName
    );

    res.status(200).json({
      success: true,
      data: nodeInstance,
    });
  } catch (error: any) {
    if (error.message.includes('not found in registry')) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create node instance',
    });
  }
};

/**
 * POST /api/workflows/nodes/validate
 * Validate a node against its configuration
 */
export const validateNodeController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { node } = req.body;

    if (!node) {
      res.status(400).json({
        success: false,
        error: 'Node data is required',
      });
      return;
    }

    const validation = NodeRegistry.validateNode(node);

    res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate node',
    });
  }
};
