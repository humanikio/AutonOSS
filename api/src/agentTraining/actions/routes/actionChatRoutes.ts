import { Router } from 'express';
import { actionChatController } from '../controllers/actionChatController';
import { promptHistoryController } from '../controllers/promptHistoryController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Chat session management
router.get('/:actionId/chat/current', actionChatController.getCurrentSession);
router.post('/:actionId/chat/message', actionChatController.sendMessage);
router.get('/:actionId/chat/sessions', actionChatController.getAllSessions);
router.post('/:actionId/chat/sessions/new', actionChatController.createNewSession);
router.delete('/:actionId/chat/sessions/:sessionId', actionChatController.deleteSession);
router.post('/:actionId/chat/sessions/:sessionId/switch', actionChatController.switchSession);

// Prompt management
router.post('/:actionId/prompt/update-session', actionChatController.updateSessionPrompt);
router.post('/:actionId/prompt/update', actionChatController.updatePrompt);
router.get('/:actionId/prompt/history', promptHistoryController.getPromptHistory);
router.post('/:actionId/prompt/rollback', promptHistoryController.rollbackPrompt);

// Action publishing
router.post('/:actionId/publish', actionChatController.publishAction);

// Action status management
router.patch('/:actionId/status', actionChatController.updateActionStatus);

// Action deletion
router.delete('/:actionId', actionChatController.deleteAction);

export { router as actionChatRoutes };