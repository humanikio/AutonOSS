/**
 * Auton Event Lifecycle Routes
 *
 * Public routes for n8n milestone callbacks.
 * These routes are protected by service key authentication, NOT user auth.
 *
 * IMPORTANT: This router is mounted ABOVE the authenticateEither middleware
 * in routes/index.ts to bypass user authentication.
 */

import { Router } from 'express';
import { validateMilestoneServiceKey } from '../../../middleware/validateMilestoneServiceKey';
import { processMilestoneCallback } from '../controllers/autonEventLifecycleController';

const router = Router();

// ==================== Event Lifecycle Routes ====================
// Protected by service key, NOT user authentication

/**
 * POST /api/event-lifecycle/milestone
 *
 * Receives milestone callbacks from n8n Milestone Runner workflow.
 * Validates the X-Milestone-Service-Key header before processing.
 */
router.post('/milestone', validateMilestoneServiceKey, processMilestoneCallback);

export default router;
