import { Router } from 'express';
import {
  createToolController,
  getToolController,
  updateToolController,
  listToolsController,
  deleteToolController,
} from '../controllers/agentToolsController';

const router = Router();

// All routes here inherit authenticateEither from parent router
// This means they accept EITHER Firebase JWT OR API Key

// POST /api/agents/:agentId/tools - Create new tool
router.post('/:agentId/tools', createToolController);

// GET /api/agents/:agentId/tools - List all tools for agent
router.get('/:agentId/tools', listToolsController);

// GET /api/agents/:agentId/tools/:toolId - Get specific tool
router.get('/:agentId/tools/:toolId', getToolController);

// PUT /api/agents/:agentId/tools/:toolId - Update tool
router.put('/:agentId/tools/:toolId', updateToolController);

// DELETE /api/agents/:agentId/tools/:toolId - Delete tool
router.delete('/:agentId/tools/:toolId', deleteToolController);

export default router;
