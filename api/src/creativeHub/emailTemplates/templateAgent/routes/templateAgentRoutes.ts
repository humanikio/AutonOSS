import express from 'express';
import { authenticateEither } from '../../../../middleware/authenticateEither';
import { templateAgentController } from '../controllers/templateAgentController';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateEither);

/**
 * POST /api/template-agent/start-cycle
 * Start an AI agent cycle to generate or improve an email template
 *
 * Body:
 * - tenantId: string (required)
 * - templateId: string (required)
 * - prompt: string (optional - AI instructions for what to generate/improve)
 *
 * Returns:
 * - cycleId: string (unique identifier for this agent cycle)
 * - status: string (running, completed, failed)
 * - startedAt: string (ISO timestamp)
 */
router.post('/start-cycle', templateAgentController.startCycle.bind(templateAgentController));

// ===========================
// Chat Routes
// ===========================

/**
 * GET /api/template-agent/chats
 * List all chats for a template
 *
 * Query:
 * - tenantId: string (required)
 * - templateId: string (required)
 */
router.get('/chats', templateAgentController.listChats.bind(templateAgentController));

/**
 * POST /api/template-agent/chats
 * Create a new chat
 *
 * Body:
 * - tenantId: string (required)
 * - templateId: string (required)
 * - name?: string (optional)
 */
router.post('/chats', templateAgentController.createChat.bind(templateAgentController));

/**
 * GET /api/template-agent/chats/:chatId
 * Get a single chat by ID
 *
 * Query:
 * - tenantId: string (required)
 * - templateId: string (required)
 */
router.get('/chats/:chatId', templateAgentController.getChat.bind(templateAgentController));

/**
 * DELETE /api/template-agent/chats/:chatId
 * Delete a chat and all its messages
 *
 * Query:
 * - tenantId: string (required)
 * - templateId: string (required)
 */
router.delete('/chats/:chatId', templateAgentController.deleteChat.bind(templateAgentController));

/**
 * GET /api/template-agent/chats/:chatId/messages
 * List all messages for a chat
 *
 * Query:
 * - tenantId: string (required)
 * - templateId: string (required)
 */
router.get('/chats/:chatId/messages', templateAgentController.listMessages.bind(templateAgentController));

/**
 * POST /api/template-agent/chats/:chatId/messages
 * Add a message to a chat
 *
 * Body:
 * - tenantId: string (required)
 * - templateId: string (required)
 * - role: 'user' | 'assistant' (required)
 * - content: string (required)
 * - metadata?: object (optional)
 */
router.post('/chats/:chatId/messages', templateAgentController.addMessage.bind(templateAgentController));

// ===========================
// Template Images Routes
// ===========================

/**
 * GET /api/template-agent/templates/:templateId/images
 * List all images for a template
 *
 * Query:
 * - tenantId: string (required)
 */
router.get('/templates/:templateId/images', templateAgentController.listTemplateImages.bind(templateAgentController));

/**
 * POST /api/template-agent/templates/:templateId/images
 * Add a library image to template
 *
 * Body:
 * - tenantId: string (required)
 * - libraryImageId: string (required)
 */
router.post('/templates/:templateId/images', templateAgentController.addImageToTemplate.bind(templateAgentController));

/**
 * DELETE /api/template-agent/templates/:templateId/images/:imageId
 * Remove an image from template
 *
 * Query:
 * - tenantId: string (required)
 */
router.delete('/templates/:templateId/images/:imageId', templateAgentController.removeImageFromTemplate.bind(templateAgentController));

export default router;
