/**
 * Review Milestone Service
 * Validates milestone callbacks from n8n and processes them
 *
 * Process:
 * 1. Fetch milestone document and validate it's in 'scheduled' status
 * 2. Fetch event and validate appointment time hasn't changed (2-minute tolerance)
 * 3. If VALID: Mark complete, notify subscribers, schedule next milestone
 * 4. If INVALID: Cancel all milestones, recompute, reschedule first one
 */

import { firestore } from '../../../../config/firebase';
import { CalendarEvent } from '../eventManager/createEvent';
import { getMilestone, getNextPendingMilestone, cancelAllPendingMilestones } from './milestoneHelpers';
import { computeMilestones } from './computeMilestones';
import { createMilestone } from './createMilestone';
import { notifySubscriptionService } from './notifySubscriptionService';
import { completeEvent } from './completeEvent';
import { TriggerExecutionResult } from '../../../../workflows/triggerSubscriptions/services/triggerExecutions';

export interface ReviewMilestoneInput {
  milestoneId: string;
  eventId: string;
  calendarId: string;
  tenantId: string;
  milestone: string; // Milestone type (e.g., '1_hour_before')
  stateHolderTimestamp: Date; // Appointment time n8n stored when scheduled
  attendeeIds: string[];
}

export interface ReviewMilestoneResult {
  success: boolean;
  message: string;
  validationResult: {
    isValid: boolean;
    reason?: string;
    timeDifferenceMs?: number;
  };
  notificationResult?: TriggerExecutionResult;
  nextMilestoneScheduled?: boolean;
  recomputeTriggered?: boolean;
  completionResult?: {
    success: boolean;
    completedAt?: Date;
    error?: string;
  };
}

/**
 * Review and process a milestone callback from n8n
 *
 * @param input - Milestone callback data from n8n
 * @returns Processing result with validation and action details
 */
export async function reviewMilestone(
  input: ReviewMilestoneInput
): Promise<ReviewMilestoneResult> {
  const {
    milestoneId,
    eventId,
    calendarId,
    tenantId,
    milestone,
    stateHolderTimestamp,
    attendeeIds
  } = input;

  console.log(`\n🔍 ======== REVIEWING MILESTONE ========`);
  console.log(`   Milestone ID: ${milestoneId}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Type: ${milestone}`);
  console.log(`   State Holder Timestamp: ${stateHolderTimestamp.toISOString()}`);

  try {
    // ========================================
    // STEP 1: Fetch and Validate Milestone Status
    // ========================================
    const milestoneDoc = await getMilestone(milestoneId, eventId, calendarId, tenantId);

    if (!milestoneDoc) {
      console.log(`❌ Milestone not found: ${milestoneId}`);
      return {
        success: false,
        message: 'Milestone not found',
        validationResult: {
          isValid: false,
          reason: 'Milestone document does not exist'
        }
      };
    }

    // Idempotency check
    if (milestoneDoc.status === 'completed') {
      console.log(`⚠️  Milestone already completed (idempotent): ${milestoneId}`);
      return {
        success: true,
        message: 'Milestone already completed (idempotent)',
        validationResult: {
          isValid: true,
          reason: 'Already processed'
        }
      };
    }

    if (milestoneDoc.status !== 'scheduled') {
      console.log(`❌ Milestone status is '${milestoneDoc.status}', expected 'scheduled'`);
      return {
        success: false,
        message: `Milestone cannot be processed (status: ${milestoneDoc.status})`,
        validationResult: {
          isValid: false,
          reason: `Invalid status: ${milestoneDoc.status}`
        }
      };
    }

    // ========================================
    // STEP 2: Fetch Event and Validate Timestamp
    // ========================================
    const eventRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId);

    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      console.log(`❌ Event not found: ${eventId}`);
      return {
        success: false,
        message: 'Event not found',
        validationResult: {
          isValid: false,
          reason: 'Event document does not exist'
        }
      };
    }

    const event = eventDoc.data() as CalendarEvent;

    // Convert Firestore timestamps to Date
    const dbStartTime = event.startTime instanceof Date
      ? event.startTime
      : (event.startTime as any).toDate();

    const dbEndTime = event.endTime instanceof Date
      ? event.endTime
      : (event.endTime as any).toDate();

    console.log(`   Database Start Time: ${dbStartTime.toISOString()}`);

    // Validate timestamp alignment (2-minute tolerance)
    const timeDifferenceMs = Math.abs(dbStartTime.getTime() - stateHolderTimestamp.getTime());
    const toleranceMs = 2 * 60 * 1000; // 2 minutes

    const isValid = timeDifferenceMs <= toleranceMs;

    console.log(`   Time Difference: ${timeDifferenceMs}ms (tolerance: ${toleranceMs}ms)`);
    console.log(`   Valid: ${isValid ? '✅' : '❌'}`);

    // ========================================
    // STEP 3A: INVALID - Timestamp Deviation Detected
    // ========================================
    if (!isValid) {
      console.log(`\n⚠️  TIMESTAMP DEVIATION DETECTED - Recomputing milestones...`);

      // Cancel all existing milestones
      const cancelledCount = await cancelAllPendingMilestones(eventId, calendarId, tenantId);
      console.log(`   Cancelled ${cancelledCount} milestone(s)`);

      // Recompute milestones based on current event time
      const computeResult = await computeMilestones({
        eventId,
        calendarId,
        tenantId,
        startTime: dbStartTime,
        endTime: dbEndTime,
        timezone: event.timezone,
        currentTime: new Date()
      });

      console.log(`   Computed ${computeResult.totalComputed} new milestone(s)`);

      // Schedule the first new milestone
      if (computeResult.milestones.length > 0) {
        const firstMilestoneId = computeResult.milestones[0];
        await createMilestone({
          milestoneId: firstMilestoneId,
          eventId,
          calendarId,
          tenantId
        });
        console.log(`   Scheduled new first milestone: ${firstMilestoneId}`);
      }

      console.log(`   ======== MILESTONE RECOMPUTED ========\n`);

      return {
        success: false,
        message: 'Timestamp deviation detected. Milestones recomputed and rescheduled.',
        validationResult: {
          isValid: false,
          reason: `Event time changed. State holder is ${timeDifferenceMs}ms out of sync.`,
          timeDifferenceMs
        },
        recomputeTriggered: true
      };
    }

    // ========================================
    // STEP 3B: VALID - Process Milestone
    // ========================================
    console.log(`\n✅ Timestamp valid - Processing milestone...`);

    // Mark milestone as completed
    const milestoneRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId)
      .collection('milestones')
      .doc(milestoneId);

    await milestoneRef.update({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`   Milestone marked as completed`);

    // Notify subscription service (trigger workflows)
    const normalizedEvent: CalendarEvent = {
      ...event,
      startTime: dbStartTime,
      endTime: dbEndTime,
      createdAt: event.createdAt instanceof Date ? event.createdAt : (event.createdAt as any).toDate(),
      updatedAt: event.updatedAt instanceof Date ? event.updatedAt : (event.updatedAt as any).toDate()
    };

    const notificationResult = await notifySubscriptionService({
      tenantId,
      eventId,
      calendarId,
      milestone,
      event: normalizedEvent,
      attendeeIds,
      primaryContactId: event.primaryContactId || null,
      primaryAttendeeId: event.primaryAttendeeId || null,
      stateHolderTimestamp,
      isValid: true
    });

    console.log(`   Notified ${notificationResult.subscriptionsFound} subscription(s)`);

    // ========================================
    // STEP 4: Handle Event Completion (Special Case)
    // ========================================
    let completionResult;

    if (milestone === 'event_completed') {
      console.log(`\n🏁 Final milestone - Marking event as completed...`);

      completionResult = await completeEvent({
        tenantId,
        calendarId,
        eventId
      });

      console.log(`   Event marked as completed`);
      console.log(`   ======== EVENT LIFECYCLE COMPLETE ========\n`);

      return {
        success: true,
        message: 'Event completed successfully',
        validationResult: {
          isValid: true,
          timeDifferenceMs
        },
        notificationResult,
        completionResult
      };
    }

    // ========================================
    // STEP 5: Schedule Next Milestone
    // ========================================
    console.log(`\n📅 Checking for next pending milestone...`);

    const nextMilestone = await getNextPendingMilestone(eventId, calendarId, tenantId);

    if (nextMilestone) {
      console.log(`   Found next milestone: ${nextMilestone.type}`);

      await createMilestone({
        milestoneId: nextMilestone.milestoneId,
        eventId,
        calendarId,
        tenantId
      });

      console.log(`   Next milestone scheduled`);
      console.log(`   ======== MILESTONE PROCESSED ========\n`);

      return {
        success: true,
        message: `Milestone '${milestone}' processed and next milestone scheduled`,
        validationResult: {
          isValid: true,
          timeDifferenceMs
        },
        notificationResult,
        nextMilestoneScheduled: true
      };
    } else {
      console.log(`   No more pending milestones`);
      console.log(`   ======== MILESTONE PROCESSED ========\n`);

      return {
        success: true,
        message: `Milestone '${milestone}' processed (no more milestones)`,
        validationResult: {
          isValid: true,
          timeDifferenceMs
        },
        notificationResult,
        nextMilestoneScheduled: false
      };
    }

  } catch (error) {
    console.error(`❌ Error reviewing milestone:`, error);
    return {
      success: false,
      message: 'Failed to process milestone',
      validationResult: {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
