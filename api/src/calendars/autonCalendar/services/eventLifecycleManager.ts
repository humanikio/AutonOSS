/**
 * Event Lifecycle Manager - Main Orchestrator
 * Coordinates event lifecycle milestone processing
 *
 * NEW Flow (Pattern B - Subworkflow Per Milestone):
 * 1. Event created → Initialize milestones (compute + schedule first)
 * 2. n8n milestone runner fires → Review milestone callback
 * 3. If timestamp valid: Complete, notify, schedule next
 * 4. If timestamp invalid: Recompute all milestones, reschedule first
 * 5. Repeat until event_completed milestone
 */

import { computeMilestones, ComputeMilestonesInput, ComputeMilestonesResult } from './eventLifecycleManager/computeMilestones';
import { createMilestone } from './eventLifecycleManager/createMilestone';
import { getNextPendingMilestone, cancelAllPendingMilestones } from './eventLifecycleManager/milestoneHelpers';

// Re-export for external use
export { reviewMilestone, ReviewMilestoneInput, ReviewMilestoneResult } from './eventLifecycleManager/reviewMilestone';

// ========================================
// NEW PATTERN B FUNCTIONS
// ========================================

export interface InitializeEventMilestonesInput {
  eventId: string;
  calendarId: string;
  tenantId: string;
  startTime: Date;
  endTime: Date;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
}

export interface InitializeEventMilestonesResult {
  success: boolean;
  message: string;
  milestonesComputed: number;
  firstMilestoneScheduled: boolean;
  error?: string;
}

/**
 * Initialize milestone system for a new event
 * Called when an event is created
 *
 * Process:
 * 1. Compute all future milestones
 * 2. Schedule the first milestone in n8n
 *
 * @param input - Event timing data
 * @returns Initialization result
 */
export async function initializeEventMilestones(
  input: InitializeEventMilestonesInput
): Promise<InitializeEventMilestonesResult> {
  const { eventId, calendarId, tenantId, startTime, endTime, timezone } = input;

  console.log(`\n🎬 ======== INITIALIZING EVENT MILESTONES ========`);
  console.log(`   Event ID: ${eventId}`);

  try {
    // STEP 1: Compute milestones
    const computeResult = await computeMilestones({
      eventId,
      calendarId,
      tenantId,
      startTime,
      endTime,
      timezone,
      currentTime: new Date()
    });

    if (!computeResult.success) {
      return {
        success: false,
        message: 'Failed to compute milestones',
        milestonesComputed: 0,
        firstMilestoneScheduled: false,
        error: computeResult.message
      };
    }

    if (computeResult.milestones.length === 0) {
      console.log(`⚠️  No milestones to schedule (event starting too soon)`);
      console.log(`   ======== INITIALIZATION COMPLETE (NO MILESTONES) ========\n`);
      return {
        success: true,
        message: 'No future milestones available',
        milestonesComputed: 0,
        firstMilestoneScheduled: false
      };
    }

    // STEP 2: Schedule the first milestone
    const firstMilestoneId = computeResult.milestones[0];

    const createResult = await createMilestone({
      milestoneId: firstMilestoneId,
      eventId,
      calendarId,
      tenantId
    });

    if (!createResult.success) {
      console.log(`❌ Failed to schedule first milestone: ${createResult.error}`);
      return {
        success: false,
        message: 'Failed to schedule first milestone',
        milestonesComputed: computeResult.totalComputed,
        firstMilestoneScheduled: false,
        error: createResult.error
      };
    }

    console.log(`✅ First milestone scheduled successfully`);
    console.log(`   ======== INITIALIZATION COMPLETE ========\n`);

    return {
      success: true,
      message: `${computeResult.totalComputed} milestone(s) computed, first milestone scheduled`,
      milestonesComputed: computeResult.totalComputed,
      firstMilestoneScheduled: true
    };

  } catch (error) {
    console.error(`❌ Error initializing milestones:`, error);
    return {
      success: false,
      message: 'Failed to initialize milestones',
      milestonesComputed: 0,
      firstMilestoneScheduled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle event update (reschedule milestones)
 * Called when an event's startTime or endTime changes
 *
 * Process:
 * 1. Cancel all pending/scheduled milestones
 * 2. Recompute milestones based on new times
 * 3. Schedule first milestone
 *
 * @param input - Updated event timing data
 * @returns Update result
 */
export async function handleEventUpdate(
  input: InitializeEventMilestonesInput
): Promise<InitializeEventMilestonesResult> {
  const { eventId, calendarId, tenantId, startTime, endTime, timezone } = input;

  console.log(`\n🔄 ======== HANDLING EVENT UPDATE ========`);
  console.log(`   Event ID: ${eventId}`);

  try {
    // STEP 1: Cancel all existing milestones
    const cancelledCount = await cancelAllPendingMilestones(eventId, calendarId, tenantId);
    console.log(`   Cancelled ${cancelledCount} milestone(s)`);

    // STEP 2: Reinitialize milestones with new times
    const initResult = await initializeEventMilestones({
      eventId,
      calendarId,
      tenantId,
      startTime,
      endTime,
      timezone
    });

    console.log(`   ======== EVENT UPDATE COMPLETE ========\n`);

    return initResult;

  } catch (error) {
    console.error(`❌ Error handling event update:`, error);
    return {
      success: false,
      message: 'Failed to handle event update',
      milestonesComputed: 0,
      firstMilestoneScheduled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
