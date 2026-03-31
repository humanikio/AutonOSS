/**
 * Complete Event Service
 * Marks an event as completed in the database
 */

import { firestore } from '../../../../config/firebase';

export interface CompleteEventInput {
  tenantId: string;
  calendarId: string;
  eventId: string;
}

export interface CompleteEventResult {
  success: boolean;
  completedAt?: Date;
  error?: string;
}

/**
 * Mark an event as completed
 * Updates the event document with completion status
 *
 * @param input - Completion parameters
 * @returns Completion result
 */
export async function completeEvent(
  input: CompleteEventInput
): Promise<CompleteEventResult> {
  const { tenantId, calendarId, eventId } = input;

  console.log(`\n Marking event as completed...`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Calendar ID: ${calendarId}`);

  try {
    const eventRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId);

    // Check if event exists
    const eventDoc = await eventRef.get();
    if (!eventDoc.exists) {
      console.log(`   L Event not found: ${eventId}`);
      return {
        success: false,
        error: 'Event not found'
      };
    }

    // Update event with completion status
    const completedAt = new Date();
    await eventRef.update({
      status: 'completed',
      completedAt,
      updatedAt: completedAt
    });

    console.log(`    Event marked as completed at ${completedAt.toISOString()}`);

    return {
      success: true,
      completedAt
    };

  } catch (error) {
    console.error(`   L Error completing event:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
