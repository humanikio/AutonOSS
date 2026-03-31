import { Router } from 'express';
import { trainingChatController } from '../controllers/trainingChatController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// GET /api/training-chat/:sessionId/messages - Get all messages for a training session
router.get('/:sessionId/messages', trainingChatController.getSessionMessages);

// POST /api/training-chat/:sessionId/send - Send a message in training mode
router.post('/:sessionId/send', trainingChatController.sendTrainingMessage);

// GET /api/training-chat/:sessionId/stats - Get session statistics
router.get('/:sessionId/stats', trainingChatController.getSessionStats);

export { router as trainingChatRoutes };