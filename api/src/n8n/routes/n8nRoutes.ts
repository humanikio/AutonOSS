import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import {
  createWorkflow,
  getAllWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getExecutionsList,
  getExecutionDetails
} from '../controllers/n8nController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Workflow CRUD endpoints
router.post('/workflows', createWorkflow);
router.get('/workflows', getAllWorkflows);
router.get('/workflows/:id', getWorkflow);
router.put('/workflows/:id', updateWorkflow);
router.delete('/workflows/:id', deleteWorkflow);

// Execution endpoints
router.get('/executions', getExecutionsList);
router.get('/executions/:executionId', getExecutionDetails);

export default router;
