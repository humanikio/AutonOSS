/**
 * Calendar AI Agent Routes
 * API endpoints for AI agent chat and cycle management
 */

import { Router } from 'express';
import {
  sendMessageController,
  getCurrentChatController,
  listChatsController,
  createChatController,
  changeCurrentChatController,
  updateChatController,
  deleteChatController,
  getChatMessagesController,
  getCurrentCycleController,
  listCyclesController
} from '../controller/calendarAiAgentController';

const router = Router();

// NOTE: All routes here should inherit authentication from parent routes
// This means they accept EITHER Firebase JWT OR API Key

// ==================== Message Processing ====================

/**
 * Send message to AI agent
 * POST /api/calendar-agent/send-message
 *
 * Body: { prompt: string, chatId?: string, calendarId?: string }
 *
 * The main endpoint for processing user messages.
 * Triggers the request orchestrator which:
 * 1. Saves user message
 * 2. Creates execution cycle
 * 3. Processes request
 * 4. Saves agent response
 */
router.post('/send-message', sendMessageController);

// ==================== Chat Management ====================

/**
 * Get current chat
 * GET /api/calendar-agent/chat/current
 */
router.get('/chat/current', getCurrentChatController);

/**
 * Change current chat
 * POST /api/calendar-agent/chat/current
 *
 * Body: { chatId: string }
 */
router.post('/chat/current', changeCurrentChatController);

/**
 * List all chats
 * GET /api/calendar-agent/chats
 */
router.get('/chats', listChatsController);

/**
 * Create new chat
 * POST /api/calendar-agent/chats
 *
 * Body: { name?: string, metadata?: object }
 */
router.post('/chats', createChatController);

/**
 * Update chat
 * PUT /api/calendar-agent/chats/:chatId
 *
 * Body: { name?: string, metadata?: object }
 */
router.put('/chats/:chatId', updateChatController);

/**
 * Delete chat
 * DELETE /api/calendar-agent/chats/:chatId
 */
router.delete('/chats/:chatId', deleteChatController);

/**
 * Get chat messages
 * GET /api/calendar-agent/chats/:chatId/messages
 *
 * Query params: ?limit=50 (optional)
 */
router.get('/chats/:chatId/messages', getChatMessagesController);

// ==================== Cycle Management ====================

/**
 * Get current cycle
 * GET /api/calendar-agent/cycle/current
 */
router.get('/cycle/current', getCurrentCycleController);

/**
 * List all cycles
 * GET /api/calendar-agent/cycles
 *
 * Query params: ?limit=20 (optional)
 */
router.get('/cycles', listCyclesController);

// ==================== Health Check ====================

/**
 * Health check endpoint
 * GET /api/calendar-agent/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'calendar-ai-agent',
    timestamp: new Date().toISOString()
  });
});

export default router;
