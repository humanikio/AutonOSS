import { Router } from 'express';
import { actionController } from '../controllers/actionController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// POST /api/agent-training/actions - Create a new action
router.post('/', actionController.createAction);

// GET /api/agent-training/actions/:actionId - Get action by ID
router.get('/:actionId', actionController.getAction);

// PUT /api/agent-training/actions/:actionId - Update existing action
router.put('/:actionId', actionController.updateAction);

// DELETE /api/agent-training/actions/:actionId - Delete action
router.delete('/:actionId', actionController.deleteAction);

// GET /api/agent-training/actions/agent/:agentId - Get all actions for an agent
router.get('/agent/:agentId', actionController.getAgentActions);

export { router as actionRoutes };