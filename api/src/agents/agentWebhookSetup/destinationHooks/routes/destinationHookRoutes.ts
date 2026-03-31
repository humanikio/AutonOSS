import { Router } from 'express';
import { destinationHookController } from '../controllers/destinationHookController';
import { authenticateToken } from '../../../../middleware/auth';

const router = Router();

// Setup endpoint for SMS destination webhook
router.post(
  '/setup-sms-destination/:tenantId/:agentId',
  authenticateToken,
  destinationHookController.setupSmsDestination
);

// Setup endpoint for Email destination webhook
router.post(
  '/setup-email-destination/:tenantId/:agentId',
  authenticateToken,
  destinationHookController.setupEmailDestination
);

// Setup endpoint for Phone destination webhook
router.post(
  '/setup-phone-destination/:tenantId/:agentId',
  authenticateToken,
  destinationHookController.setupPhoneDestination
);

// Get all destination webhooks for an agent
router.get(
  '/destinations/:tenantId/:agentId',
  authenticateToken,
  destinationHookController.getDestinationWebhooks
);

// Get a specific destination webhook by key
router.get(
  '/destination/:tenantId/:agentId/:destinationKey',
  authenticateToken,
  destinationHookController.getDestinationWebhook
);

// Delete a destination webhook
router.delete(
  '/destination/:tenantId/:agentId/:destinationKey',
  authenticateToken,
  destinationHookController.deleteDestination
);

// Toggle destination webhook active state
router.put(
  '/destination/:tenantId/:agentId/:destinationKey/toggle',
  authenticateToken,
  destinationHookController.toggleDestinationActive
);

// Test destination webhook
router.post(
  '/destination/:tenantId/:agentId/:destinationKey/test',
  authenticateToken,
  destinationHookController.testDestinationWebhook
);

export default router;