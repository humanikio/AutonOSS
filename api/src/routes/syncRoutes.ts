import { Router } from 'express';
import { SyncController } from '../controllers/syncController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all sync routes
router.use(authenticateToken);

// Knowledge sync endpoints
router.get('/knowledge/changes', SyncController.getKnowledgeChanges);
router.get('/knowledge/sync-status', SyncController.getSyncStatus);
router.post('/knowledge/sync', SyncController.syncKnowledge);
router.get('/knowledge/affected-agents', SyncController.getAffectedAgents);

// Single agent sync endpoint
router.post('/agents/:id/knowledge/sync', SyncController.syncSingleAgentKnowledge);

export default router;