/**
 * Trigger Subscription Routes
 * API routes for managing workflow trigger subscriptions
 */

import { Router } from 'express';
import { triggerSubscriptionController } from '../controllers/triggerSubscriptionController';
import { authenticateEither } from '../../../middleware/authenticateEither';

const router = Router();

// All routes require authentication
router.use(authenticateEither);

/**
 * POST /api/workflows/trigger-subscriptions
 * Create a new trigger subscription
 *
 * Body:
 * - workflowId: string (REQUIRED)
 * - triggerType: string (REQUIRED) - e.g., "sms.received.v1"
 * - enabled: boolean (optional, default: true)
 * - conditions: object (optional) - Manually specified conditions
 * - priority: number (optional, default: 100)
 * - rateLimit: object (optional)
 * - nodeParameters: object (optional) - Trigger node parameters for auto-condition building
 *
 * Example with nodeParameters (Event Lifecycle Milestone):
 * {
 *   "workflowId": "workflow-abc",
 *   "triggerType": "event.lifecycle.milestone.v1",
 *   "nodeParameters": {
 *     "milestoneFilter": "1_hour_before",
 *     "eventTypeFilter": "meeting"
 *   }
 * }
 * → Auto-generates: conditions.payload = { "milestone": { "$eq": "1_hour_before" }, "eventData.eventType": { "$eq": "meeting" } }
 */
router.post('/', triggerSubscriptionController.createSubscription.bind(triggerSubscriptionController));

/**
 * GET /api/workflows/trigger-subscriptions
 * List all subscriptions for a tenant with optional filters
 *
 * Query params:
 * - triggerType: string (optional) - Filter by event type
 * - enabled: boolean (optional) - Filter by active/inactive
 * - workflowId: string (optional) - Filter by workflow
 */
router.get('/', triggerSubscriptionController.getSubscriptions.bind(triggerSubscriptionController));

/**
 * POST /api/workflows/trigger-subscriptions/execute
 * Execute trigger subscriptions for a given event
 *
 * Body:
 * - triggerType: string (REQUIRED) - e.g., "sms.received.v1", "phone.call.completed.v1"
 * - payload: object (REQUIRED) - Event data matching trigger schema
 *
 * Response:
 * - success: boolean
 * - subscriptionsFound: number
 * - executionResults: array of execution results per subscription
 * - summary: { total, completed, failed }
 */
router.post('/execute', triggerSubscriptionController.executeSubscriptions.bind(triggerSubscriptionController));

/**
 * GET /api/workflows/trigger-subscriptions/:subscriptionId
 * Get a specific subscription by ID
 *
 * Params:
 * - subscriptionId: string (REQUIRED)
 */
router.get('/:subscriptionId', triggerSubscriptionController.readSubscription.bind(triggerSubscriptionController));

/**
 * PUT /api/workflows/trigger-subscriptions/:subscriptionId
 * Update a subscription
 *
 * Params:
 * - subscriptionId: string (REQUIRED)
 *
 * Body:
 * - enabled: boolean (optional)
 * - conditions: object (optional)
 * - priority: number (optional)
 * - rateLimit: object (optional)
 * - nodeParameters: object (optional) - Trigger node parameters for auto-condition rebuilding
 *
 * Example with nodeParameters:
 * {
 *   "nodeParameters": {
 *     "milestoneFilter": "30_minutes_before",
 *     "eventTypeFilter": "meeting"
 *   }
 * }
 * → Regenerates: conditions.payload = { "milestone": { "$eq": "30_minutes_before" }, ... }
 */
router.put('/:subscriptionId', triggerSubscriptionController.updateSubscription.bind(triggerSubscriptionController));

/**
 * DELETE /api/workflows/trigger-subscriptions/:subscriptionId
 * Delete a subscription
 *
 * Params:
 * - subscriptionId: string (REQUIRED)
 */
router.delete('/:subscriptionId', triggerSubscriptionController.deleteSubscription.bind(triggerSubscriptionController));

export default router;
