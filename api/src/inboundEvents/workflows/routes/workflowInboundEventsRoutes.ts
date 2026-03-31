import express from 'express';
import { authenticateEither } from '../../../middleware/authenticateEither';
import { workflowInboundEventsController } from '../controllers/workflowInboundEventsController';

const router = express.Router();

// Generate a new test URL for a workflow (overwrites any existing test URL)
router.post(
  '/:workflowId/generate-test-url',
  authenticateEither,
  workflowInboundEventsController.generateTestUrl
);

// Get the active test URL for a workflow
router.get(
  '/:workflowId/test-url',
  authenticateEither,
  workflowInboundEventsController.getActiveTestUrl
);

// Public endpoint to receive test payloads (no authentication)
router.post(
  '/test/:url',
  workflowInboundEventsController.processTestPayload
);

// Get the latest test payload received for a workflow
router.get(
  '/:workflowId/test-payload/latest',
  authenticateEither,
  workflowInboundEventsController.getLatestTestPayload
);

export default router;
