import { Router } from 'express';
import { agentTrainingController } from '../controllers/agentTrainingController';
import { authenticateToken } from '../../middleware/auth';
import { actionRoutes } from '../actions/routes/actionRoutes';
import { actionChatRoutes } from '../actions/routes/actionChatRoutes';
import { startTrainingWidgetConversation } from '../controllers/trainingWidgetController';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// POST /api/agent-training/start - Start a new training session
router.post('/start', agentTrainingController.startTrainingSession);

// GET /api/agent-training/session/:sessionId - Get training session details
router.get('/session/:sessionId', agentTrainingController.getTrainingSession);

// PUT /api/agent-training/session/:sessionId/end - End a training session
router.put('/session/:sessionId/end', agentTrainingController.endTrainingSession);

// POST /api/agent-training/session/:sessionId/message - Add message to session
router.post('/session/:sessionId/message', agentTrainingController.addMessage);

// POST /api/agent-training/session/:sessionId/analysis-cycle - Start analysis cycle
router.post('/session/:sessionId/analysis-cycle', agentTrainingController.startAnalysisCycle);

// GET /api/agent-training/sessions/:agentId - Get previous training sessions for agent
router.get('/sessions/:agentId', agentTrainingController.getPreviousSessions);

// POST /api/agent-training/sessions/:sessionId/agents/:agentId/apply-suggestions - Apply cycle suggestions
router.post('/sessions/:sessionId/agents/:agentId/apply-suggestions', agentTrainingController.applyCycleSuggestions);

// GET /api/agent-training/sessions/:sessionId/cycles/:cycleId/preview - Preview cycle suggestions
router.get('/sessions/:sessionId/cycles/:cycleId/preview', agentTrainingController.previewCycleSuggestions);

// POST /api/agent-training/sessions/:sessionId/clear-chat - Clear chat messages from session
router.post('/sessions/:sessionId/clear-chat', agentTrainingController.clearSessionChat);

// GET /api/agent-training/sessions/:sessionId/test-agent-config/:agentId - Get test agent configuration
router.get('/sessions/:sessionId/test-agent-config/:agentId', agentTrainingController.getTestAgentConfig);

// PUT /api/agent-training/sessions/:sessionId/test-agent-config/:agentId - Update test agent configuration
router.put('/sessions/:sessionId/test-agent-config/:agentId', agentTrainingController.updateTestAgentConfig);

// POST /api/agent-training/start-widget-conversation - Start a widget conversation for training
router.post('/start-widget-conversation', startTrainingWidgetConversation);

// POST /api/agent-training/publish-configs/get - Get training configuration for publishing
router.post('/publish-configs/get', agentTrainingController.getPublishConfigs);

// POST /api/agent-training/publish-configs/update - Update training configuration before publishing
router.post('/publish-configs/update', agentTrainingController.updatePublishConfigs);

// POST /api/agent-training/publish-configs/publish - Publish training configuration to production
router.post('/publish-configs/publish', agentTrainingController.publishTrainingConfigs);

// Mount action routes at /api/agent-training/actions
router.use('/actions', actionRoutes);

// Mount action chat routes at /api/agent-training/actions (includes chat endpoints)
router.use('/actions', actionChatRoutes);

export { router as agentTrainingRoutes };