import { Router } from 'express';
import { agentWebhookSetupController } from '../controllers/agentWebhookSetupController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// SMS Webhook Routes
router.post('/sms/inbound', authenticateToken, agentWebhookSetupController.createSmsInboundWebhook);
router.post('/sms/outbound', authenticateToken, agentWebhookSetupController.createSmsOutboundWebhook);

// Email Webhook Routes  
router.post('/email/inbound', authenticateToken, agentWebhookSetupController.createEmailInboundWebhook);
router.post('/email/outbound', authenticateToken, agentWebhookSetupController.createEmailOutboundWebhook);

// Phone Webhook Routes
router.post('/phone/inbound', authenticateToken, agentWebhookSetupController.createPhoneInboundWebhook);
router.post('/phone/outbound', authenticateToken, agentWebhookSetupController.createPhoneOutboundWebhook);

// Webhook Deletion Routes
router.delete('/:tenantId/:agentId/:webhookId', authenticateToken, agentWebhookSetupController.deleteWebhook);
router.patch('/:tenantId/:agentId/:webhookId/deactivate', authenticateToken, agentWebhookSetupController.deactivateWebhook);
router.delete('/:tenantId/:agentId/bulk', authenticateToken, agentWebhookSetupController.bulkDeleteWebhooks);

export { router as agentWebhookSetupRoutes };