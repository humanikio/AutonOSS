import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { InvitationController } from '../controllers/invitationController';

const router = Router();
const invitationController = new InvitationController();

/**
 * GET /api/invitations/:invitationId
 * Get invitation details by invitation ID (public route for invitation acceptance)
 */
router.get('/:invitationId', invitationController.getInvitation.bind(invitationController));

/**
 * POST /api/invitations/:invitationId/accept
 * Accept an invitation and create user account
 * Note: No authenticateToken middleware because the user doesn't exist yet
 */
router.post('/:invitationId/accept', invitationController.acceptInvitation.bind(invitationController));

export default router;