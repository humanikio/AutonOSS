import { Router } from 'express';
import { authenticateToken as authenticate } from '../../../middleware/auth';
import { aiOpportunityAgentController } from '../controllers/aiOpportunityAgentController';

const router = Router();

// AI Assistant session routes
router.post('/sessions/start', authenticate, aiOpportunityAgentController.startSession);
router.post('/sessions/:sessionId/message', authenticate, aiOpportunityAgentController.processMessage);
router.get('/sessions/:sessionId', authenticate, aiOpportunityAgentController.getSession);
router.get('/sessions', authenticate, aiOpportunityAgentController.getRecentSessions);
router.post('/sessions/:sessionId/publish', authenticate, aiOpportunityAgentController.publishPipeline);

export default router;