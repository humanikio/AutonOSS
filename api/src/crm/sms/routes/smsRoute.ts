import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { smsController } from '../controllers/smsController';

const router = express.Router();

router.use(authenticateEither);

/**
 * POST /api/sms/send
 * Send SMS message to a contact
 * 
 * Body:
 * - tenantId: string
 * - contactId: string  
 * - conversationId: string
 * - phoneNumber: string (from phone number SID)
 * - message: string
 * - to: string (recipient phone number)
 * - agentId?: string (optional, for agent-sent messages)
 */
router.post('/send', smsController.sendSms.bind(smsController));

export default router;