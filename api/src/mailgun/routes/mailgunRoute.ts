import express from 'express';
import { authenticateEither } from '../../middleware/authenticateEither';
import { mailgunController } from '../controllers/mailgunController';

const router = express.Router();

router.use(authenticateEither);

/**
 * POST /api/mailgun/alias/generate
 * Generate a Mailgun reply-to alias for tracking
 *
 * Body:
 * - tenantId: string (required)
 * - contactId: string (required)
 * - conversationId: string (optional)
 */
router.post('/alias/generate', mailgunController.generateAlias.bind(mailgunController));

/**
 * POST /api/mailgun/alias/resolve
 * Resolve a Mailgun alias back to its components
 *
 * Body:
 * - alias: string (required)
 */
router.post('/alias/resolve', mailgunController.resolveAlias.bind(mailgunController));

export default router;
