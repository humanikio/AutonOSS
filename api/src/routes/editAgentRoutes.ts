import { Router } from 'express';
import { EditAgentController } from '../controllers/editAgentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/:agentId', EditAgentController.getAgentForEdit);
router.put('/:agentId/basic', EditAgentController.updateBasicInfo);
router.put('/:agentId/voice', EditAgentController.updateVoiceSettings);
router.put('/:agentId/conversation', EditAgentController.updateConversationSettings);
router.put('/:agentId/behavior', EditAgentController.updateBehaviorSettings);
router.put('/:agentId/knowledge', EditAgentController.updateKnowledgeBase);

export { router as editAgentRoutes };