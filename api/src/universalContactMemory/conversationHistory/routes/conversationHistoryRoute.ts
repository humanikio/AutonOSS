import { Router, Request, Response, NextFunction } from 'express';
import { conversationHistoryController } from '../controllers/conversationHistoryController';

const router = Router();

// Debug middleware to log incoming requests
const debugConversationHistory = (req: Request, res: Response, next: NextFunction) => {
  console.log('> Conversation History - Request received:');
  console.log('= Headers:', JSON.stringify(req.headers, null, 2));
  console.log('= Query params:', JSON.stringify(req.query, null, 2));
  console.log('< URL:', req.originalUrl);
  console.log('= Method:', req.method);
  console.log('= Timestamp:', new Date().toISOString());
  console.log('=====================================');
  next();
};

/**
 * GET /api/universal-contact-memory/conversation-history/:contactId/:conversationId
 * Endpoint for retrieving conversation history with intelligent truncation and summarization
 * (tenantId derived from req.tenantId set by authenticateEither middleware)
 *
 * Path Parameters:
 * - contactId: The contact identifier
 * - conversationId: The conversation identifier
 *
 * Query Parameters:
 * - messageLimit?: number (default: 15) - Number of recent messages to fetch
 *
 * Response:
 * {
 *   success: boolean;
 *   data: {
 *     conversationId: string;
 *     messages: Message[];
 *     summary?: string;
 *     totalMessages: number;
 *     hasMoreHistory: boolean;
 *   }
 * }
 */
router.get(
  '/:contactId/:conversationId',
  debugConversationHistory,
  conversationHistoryController.getConversationHistory.bind(conversationHistoryController)
);

/**
 * GET /api/universal-contact-memory/conversation-history/health
 * Health check endpoint
 */
router.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    service: 'universal-contact-memory-conversation-history',
    timestamp: new Date().toISOString()
  });
});

export default router;