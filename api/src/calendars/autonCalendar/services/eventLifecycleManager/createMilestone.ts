/**
 * Create Milestone Service
 * Schedules an individual milestone by triggering the n8n Milestone Runner workflow
 *
 * Process:
 * 1. Fetch milestone document from Firestore
 * 2. Validate milestone is still pending (idempotency check)
 * 3. Trigger n8n Milestone Runner webhook
 * 4. Store n8n executionId and update status to 'scheduled'
 */

import { firestore } from '../../../../config/firebase';
import { MilestoneDocument } from './computeMilestones';
import axios from 'axios';

export interface CreateMilestoneInput {
  milestoneId: string;
  eventId: string;
  calendarId: string;
  tenantId: string;
}

export interface CreateMilestoneResult {
  success: boolean;
  message: string;
  n8nExecutionId?: string;
  error?: string;
}

// n8n Milestone Runner webhook URL
// Created via: src/calendars/autonCalendar/scripts/createMilestoneRunnerWorkflow.ts
const N8N_API_URL = process.env.N8N_API_URL || 'https://automations.myzylo.app';
const MILESTONE_RUNNER_WEBHOOK_PATH = '/webhook/calendar-milestone-runner';

/**
 * Schedule a milestone by triggering n8n Milestone Runner
 *
 * @param input - Milestone identifiers
 * @returns Result with n8n executionId
 */
export async function createMilestone(
  input: CreateMilestoneInput
): Promise<CreateMilestoneResult> {
  const { milestoneId, eventId, calendarId, tenantId } = input;

  console.log(`\n📅 ======== SCHEDULING MILESTONE ========`);
  console.log(`   Milestone ID: ${milestoneId}`);
  console.log(`   Event ID: ${eventId}`);

  try {
    // 1. Fetch milestone document
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

    const milestoneDoc = await milestoneRef.get();

    if (!milestoneDoc.exists) {
      console.log(`❌ Milestone not found: ${milestoneId}`);
      return {
        success: false,
        message: 'Milestone not found',
        error: 'Milestone document does not exist'
      };
    }

    const milestone = milestoneDoc.data() as MilestoneDocument;

    // 2. Fetch event to get attendee and contact information
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
        error: 'Event document does not exist'
      };
    }

    const event = eventDoc.data();
    const attendeeIds = event?.attendees || [];
    const primaryContactId = event?.primaryContactId || null;
    const primaryAttendeeId = event?.primaryAttendeeId || null;

    console.log(`   Attendees: ${attendeeIds.length}`);
    console.log(`   Primary Contact ID: ${primaryContactId || 'none'}`);
    console.log(`   Primary Attendee ID: ${primaryAttendeeId || 'none'}`);

    // Convert Firestore Timestamps to Date objects
    const executionTime = milestone.executionTime instanceof Date
      ? milestone.executionTime
      : (milestone.executionTime as any).toDate();

    const appointmentTime = milestone.appointmentTime instanceof Date
      ? milestone.appointmentTime
      : (milestone.appointmentTime as any).toDate();

    // 3. Validate milestone is pending (idempotency check)
    if (milestone.status !== 'pending') {
      console.log(`⚠️  Milestone already ${milestone.status}: ${milestoneId}`);
      return {
        success: false,
        message: `Milestone already ${milestone.status}`,
        error: `Cannot schedule milestone with status: ${milestone.status}`,
        n8nExecutionId: milestone.n8nExecutionId || undefined
      };
    }

    console.log(`   Type: ${milestone.type}`);
    console.log(`   Execution Time: ${executionTime.toISOString()}`);
    console.log(`   Appointment Time: ${appointmentTime.toISOString()}`);

    // 4. Mark milestone as 'scheduled' BEFORE triggering n8n webhook
    // This prevents race condition where n8n callback arrives before status update
    const placeholderExecutionId = `pending-${Date.now()}`;
    await milestoneRef.update({
      status: 'scheduled',
      n8nExecutionId: placeholderExecutionId,
      scheduledAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Milestone pre-marked as scheduled (prevents race condition)`);

    // 5. Prepare payload for n8n Milestone Runner
    const payload = {
      tenantId,
      eventId,
      calendarId,
      milestoneId,
      milestone: milestone.type,
      dueAtUtc: executionTime.toISOString(),
      appointmentTime: appointmentTime.toISOString(),
      attendeeIds,
      primaryContactId,
      primaryAttendeeId,
      contactId: primaryContactId, // Alias for adapter compatibility
      idempotencyKey: `${eventId}|${milestone.type}`
    };

    const webhookUrl = `${N8N_API_URL}${MILESTONE_RUNNER_WEBHOOK_PATH}`;
    console.log(`\n📡 Triggering n8n Milestone Runner webhook...`);
    console.log(`   URL: ${webhookUrl}`);

    // 6. Trigger n8n webhook
    const n8nResponse = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract execution ID from response (webhook returns immediately with executionId)
    const executionId = n8nResponse.data?.executionId || `webhook-${Date.now()}`;

    console.log(`✅ n8n webhook triggered successfully`);
    console.log(`   Execution ID: ${executionId}`);

    // 7. Update milestone with actual executionId (status already 'scheduled')
    await milestoneRef.update({
      n8nExecutionId: executionId,
      updatedAt: new Date()
    });

    console.log(`✅ Milestone executionId updated`);
    console.log(`   ======== MILESTONE SCHEDULED ========\n`);

    return {
      success: true,
      message: `Milestone ${milestone.type} scheduled successfully`,
      n8nExecutionId: executionId
    };

  } catch (error) {
    console.error(`❌ Error scheduling milestone:`, error);

    // Revert milestone status to 'pending' or mark as 'failed'
    // (it may have been pre-marked as 'scheduled' before the webhook failed)
    try {
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
        status: 'failed',
        failedAt: new Date(),
        updatedAt: new Date(),
        failureReason: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`⚠️ Milestone reverted to 'failed' status after webhook error`);
    } catch (updateError) {
      console.error(`❌ Failed to update milestone status:`, updateError);
    }

    return {
      success: false,
      message: 'Failed to schedule milestone',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
