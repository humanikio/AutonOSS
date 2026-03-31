import express from 'express';
import { CallAgentController } from '../controllers/callAgentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Call agent CRUD routes
router.get('/', CallAgentController.getCallAgents);
router.post('/', CallAgentController.createCallAgent);
router.get('/:id', CallAgentController.getCallAgent);
router.put('/:id', CallAgentController.updateCallAgent);
router.delete('/:id', CallAgentController.deleteCallAgent);

// Agent status management
router.patch('/:id/status', CallAgentController.toggleAgentStatus);

export default router;