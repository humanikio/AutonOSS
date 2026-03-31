import express from 'express';
import { conversationController } from '../controllers/conversationController';

const router = express.Router();

/**
 * POST /api/conversations/:tenantId/:contactId/:conversationId/toggle-star
 * Toggle the starred status of a conversation
 * (tenantId validated against req.tenantId from JWT)
 */
router.post('/:tenantId/:contactId/:conversationId/toggle-star', conversationController.toggleStar.bind(conversationController));

/**
 * POST /api/conversations/:tenantId/:contactId/:conversationId/manage
 * Update conversation information
 * (tenantId validated against req.tenantId from JWT)
 *
 * Body can contain any of:
 * - isStarred: boolean
 * - status: 'open' | 'closed'
 * - assigned_user_id: string
 */
router.post('/:tenantId/:contactId/:conversationId/manage', conversationController.updateConversation.bind(conversationController));

/**
 * GET /api/conversations/:tenantId/:contactId/:conversationId
 * Get conversation information
 * (tenantId validated against req.tenantId from JWT)
 */
router.get('/:tenantId/:contactId/:conversationId', conversationController.getConversation.bind(conversationController));

/**
 * POST /api/conversations/:tenantId/:contactId/:conversationId/mark-read
 * Mark conversation as read (resets unread count to 0)
 * (tenantId validated against req.tenantId from JWT)
 */
router.post('/:tenantId/:contactId/:conversationId/mark-read', conversationController.markAsRead.bind(conversationController));

export default router;