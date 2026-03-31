/**
 * Node Registry Routes
 * API routes for accessing node registry
 */

import { Router } from 'express';
import {
  getAllNodesController,
  getNodeConfigController,
  getNodesByCategoryController,
  getNodeStatsController,
  createNodeInstanceController,
  validateNodeController,
} from '../controllers/nodeRegistryController';

const router = Router();

// GET /api/workflows/nodes - Get all available nodes
router.get('/nodes', getAllNodesController);

// GET /api/workflows/nodes/stats - Get node statistics
router.get('/nodes/stats', getNodeStatsController);

// GET /api/workflows/nodes/category/:category - Get nodes by category
router.get('/nodes/category/:category', getNodesByCategoryController);

// GET /api/workflows/nodes/:nodeName - Get specific node config
router.get('/nodes/:nodeName', getNodeConfigController);

// POST /api/workflows/nodes/:nodeName/create-instance - Create node instance
router.post('/nodes/:nodeName/create-instance', createNodeInstanceController);

// POST /api/workflows/nodes/validate - Validate a node
router.post('/nodes/validate', validateNodeController);

export default router;
