import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { emailController } from '../controllers/emailController';

const router = express.Router();

router.use(authenticateEither);

/**
 * POST /api/email/send
 * Send email message to a contact
 *
 * Body:
 * - tenantId: string (required)
 * - contactId: string (required)
 * - conversationId: string (optional - will be auto-created)
 * - emailAccountId: string (optional - will use default account if not provided)
 * - subject: string (required - email subject)
 * - message: string (required - email body)
 * - to: string (required - recipient email address)
 */
router.post('/send', emailController.sendEmail.bind(emailController));

/**
 * GET /api/email/accounts
 * Get available email accounts for a tenant
 * 
 * Query:
 * - tenantId: string
 */
router.get('/accounts', emailController.getEmailAccounts.bind(emailController));

/**
 * POST /api/email/status
 * Update message status (for webhook integration later)
 * 
 * Body:
 * - tenantId: string
 * - contactId: string
 * - conversationId: string
 * - messageId: string
 * - status: string
 */
router.post('/status', emailController.updateMessageStatus.bind(emailController));

export default router;