/**
 * Notify Subscription Service
 * Triggers workflow subscriptions for event lifecycle milestones
 */

import { executeTrigger, TriggerExecutionResult } from '../../../../workflows/triggerSubscriptions/services/triggerExecutions';
import { CalendarEvent } from '../eventManager/createEvent';

export interface NotifySubscriptionInput {
  tenantId: string;
  eventId: string;
  calendarId: string;
  milestone: string;
  event: CalendarEvent;
  attendeeIds: string[];
  primaryContactId: string | null;
  primaryAttendeeId: string | null;
  stateHolderTimestamp: Date;
  isValid: boolean;
}

/**
 * Notify workflow subscriptions about an event lifecycle milestone
 * Calls the trigger execution system to fan out to subscribed workflows
 *
 * Executes TWO types of subscriptions:
 * 1. Trigger subscriptions (event.lifecycle.milestone.v1) - Start fresh workflow executions
 * 2. Wait subscriptions (event.lifecycle.milestone.wait.v1) - Resume paused workflow executions
 *
 * @param input - Notification parameters
 * @returns Trigger execution result
 */
export async function notifySubscriptionService(
  input: NotifySubscriptionInput
): Promise<TriggerExecutionResult> {
  const {
    tenantId,
    eventId,
    calendarId,
    milestone,
    event,
    attendeeIds,
    primaryContactId,
    primaryAttendeeId,
    stateHolderTimestamp,
    isValid
  } = input;

  console.log(`\n📣 Notifying subscription service for milestone: ${milestone}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Attendees: ${attendeeIds.length}`);
  console.log(`   Primary Contact ID: ${primaryContactId || 'none'}`);

  // Compute guest attendee IDs (all except primary)
  const guestAttendeeIds = primaryAttendeeId
    ? attendeeIds.filter(id => id !== primaryAttendeeId)
    : attendeeIds;

  // Structure payload according to event.lifecycle.milestone.v1 schema
  const payload = {
    // Core identifiers (required)
    tenantId,
    eventId,
    calendarId,

    // Milestone information
    milestone,

    // Contact ID (flat, for contact adapter compatibility)
    contactId: primaryContactId, // Alias primaryContactId as contactId for adapter nodes

    // Primary attendee information (GHL-style model)
    primaryContactId,
    primaryAttendeeId,

    // Attendee information
    attendeeIds,
    guestAttendeeIds,

    // Full event data for convenience
    eventData: {
      eventId: event.eventId,
      calendarId: event.calendarId,
      tenantId: event.tenantId,
      eventName: event.eventName,
      eventType: event.eventType,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      color: event.color,
      isAllDay: event.isAllDay,
      attendees: event.attendees || [],
      primaryContactId: event.primaryContactId || null,
      primaryAttendeeId: event.primaryAttendeeId || null,
      metadata: event.metadata || {}
    },

    // Metadata
    timestamp: new Date().toISOString(),
    stateHolderTimestamp: stateHolderTimestamp.toISOString(),
    isValid
  };

  console.log(`   Payload prepared with ${Object.keys(payload).length} fields`);

  try {
    // Execute BOTH trigger subscriptions (start workflows) AND wait subscriptions (resume paused workflows)
    console.log('\n🎯 Executing trigger subscriptions (start workflows)...');
    const triggerResult = await executeTrigger({
      tenantId,
      triggerType: 'event.lifecycle.milestone.v1',  // Webhook pattern
      payload
    });

    console.log(`    Trigger subscriptions:`);
    console.log(`      - Found: ${triggerResult.subscriptionsFound}`);
    console.log(`      - Completed: ${triggerResult.summary.completed}`);
    console.log(`      - Failed: ${triggerResult.summary.failed}`);

    console.log('\n⏸️  Executing wait subscriptions (resume paused workflows)...');
    const waitResult = await executeTrigger({
      tenantId,
      triggerType: 'event.lifecycle.milestone.wait.v1',  // ResumeUrl pattern
      payload: {
        ...payload,
        value: milestone  // Map 'milestone' to 'value' for wait subscription filtering
      }
    });

    console.log(`    Wait subscriptions:`);
    console.log(`      - Found: ${waitResult.subscriptionsFound}`);
    console.log(`      - Completed: ${waitResult.summary.completed}`);
    console.log(`      - Failed: ${waitResult.summary.failed}`);

    // Return combined results
    return {
      success: triggerResult.success && waitResult.success,
      message: `Triggers: ${triggerResult.summary.completed}/${triggerResult.subscriptionsFound}, Waits: ${waitResult.summary.completed}/${waitResult.subscriptionsFound}`,
      subscriptionsFound: triggerResult.subscriptionsFound + waitResult.subscriptionsFound,
      executionResults: [...triggerResult.executionResults, ...waitResult.executionResults],
      summary: {
        total: triggerResult.summary.total + waitResult.summary.total,
        completed: triggerResult.summary.completed + waitResult.summary.completed,
        failed: triggerResult.summary.failed + waitResult.summary.failed
      }
    };

  } catch (error) {
    console.error(`   ❌ Error executing trigger subscriptions:`, error);

    // Return failed result
    return {
      success: false,
      message: `Failed to execute trigger: ${error instanceof Error ? error.message : 'Unknown error'}`,
      subscriptionsFound: 0,
      executionResults: [],
      summary: {
        total: 0,
        completed: 0,
        failed: 0
      }
    };
  }
}
