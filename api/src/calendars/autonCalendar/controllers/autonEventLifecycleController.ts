/**
 * Auton Event Lifecycle Controller
 *
 * Handles inbound milestone callbacks from n8n workflow.
 * This controller is protected by service key authentication (not user auth).
 */

import { Request, Response } from 'express';
import {
  reviewMilestone,
  ReviewMilestoneInput
} from '../services/eventLifecycleManager';

/**
 * Process event lifecycle milestone callback from n8n
 * POST /api/event-lifecycle/milestone
 *
 * Called by n8n Milestone Runner workflow when a milestone timer fires.
 * Protected by X-Milestone-Service-Key header (not user authentication).
 *
 * Expected body:
 * {
 *   tenantId: string,
 *   eventId: string,
 *   calendarId: string,
 *   milestoneId: string,
 *   milestone: string,
 *   stateHolderTimestamp: string (ISO date),
 *   attendeeIds?: string[]
 * }
 */
export const processMilestoneCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n=== MILESTONE CALLBACK RECEIVED ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Extract milestone data from request body
    const {
      tenantId,
      eventId,
      calendarId,
      milestoneId,
      milestone,
      stateHolderTimestamp,
      attendeeIds
    } = req.body;

    // Validate required fields
    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
      return;
    }

    if (!eventId) {
      res.status(400).json({
        success: false,
        error: 'Event ID is required'
      });
      return;
    }

    if (!calendarId) {
      res.status(400).json({
        success: false,
        error: 'Calendar ID is required'
      });
      return;
    }

    if (!milestoneId) {
      res.status(400).json({
        success: false,
        error: 'Milestone ID is required'
      });
      return;
    }

    if (!milestone) {
      res.status(400).json({
        success: false,
        error: 'Milestone type is required'
      });
      return;
    }

    if (!stateHolderTimestamp) {
      res.status(400).json({
        success: false,
        error: 'State holder timestamp is required'
      });
      return;
    }

    // Convert timestamp string to Date
    const timestampDate = new Date(stateHolderTimestamp);
    if (isNaN(timestampDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid timestamp format'
      });
      return;
    }

    // Prepare input for milestone review
    const input: ReviewMilestoneInput = {
      milestoneId,
      tenantId,
      eventId,
      calendarId,
      milestone,
      stateHolderTimestamp: timestampDate,
      attendeeIds: attendeeIds || []
    };

    // Process milestone through review service
    const result = await reviewMilestone(input);

    // Return appropriate status code based on result
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          validation: result.validationResult,
          recomputeTriggered: result.recomputeTriggered,
          nextMilestoneScheduled: result.nextMilestoneScheduled,
          notification: result.notificationResult ? {
            subscriptionsTriggered: result.notificationResult.subscriptionsFound,
            completed: result.notificationResult.summary.completed,
            failed: result.notificationResult.summary.failed
          } : undefined,
          completion: result.completionResult
        }
      });
    } else {
      // Even if validation failed (e.g., timestamp deviation), we still processed it
      // Return 200 for recompute scenarios, 400 for actual errors
      const statusCode = result.recomputeTriggered ? 200 : 400;

      res.status(statusCode).json({
        success: result.recomputeTriggered ? true : false,
        message: result.message,
        data: {
          validation: result.validationResult,
          recomputeTriggered: result.recomputeTriggered
        }
      });
    }

  } catch (error) {
    console.error('Error processing milestone callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process milestone callback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
