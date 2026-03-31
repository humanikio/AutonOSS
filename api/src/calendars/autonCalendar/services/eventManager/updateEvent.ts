import { firestore } from '../../../../config/firebase';
import { CalendarEvent, EventType } from './createEvent';
import { attendeeOrchestrator } from '../../utils/attendeeOrchestrator';
import { AddAttendeeInput } from '../atendeesManager';

export interface UpdateEventInput {
  eventName?: string;
  eventType?: EventType;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: AddAttendeeInput[]; // Full attendee objects for update
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

/**
 * Update an event
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @param input - Update data
 * @returns The updated event or null if not found
 */
export async function updateEvent(
  tenantId: string,
  calendarId: string,
  eventId: string,
  input: UpdateEventInput
): Promise<CalendarEvent | null> {
  try {
    console.log(`📅 Updating event: ${eventId}`);

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
    const doc = await eventRef.get();
    if (!doc.exists) {
      console.log(`❌ Event not found: ${eventId} for calendar ${calendarId}`);
      return null;
    }

    // Prepare update data (exclude attendees - handled separately)
    const { attendees, ...otherUpdates } = input;

    const updateData: any = {
      ...otherUpdates,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update event document (without attendees)
    await eventRef.update(updateData);

    console.log(`✅ Event fields updated: ${eventId}`);

    // Handle attendees update separately if provided
    if (attendees !== undefined) {
      console.log(`👥 Syncing attendees for event ${eventId}`);

      // Validate attendees if provided
      if (attendees && attendees.length > 0) {
        attendeeOrchestrator.validateAttendees(attendees);
      }

      // Sync attendees (create, update, delete as needed)
      const attendeeIds = await attendeeOrchestrator.syncEventAttendees(
        tenantId,
        calendarId,
        eventId,
        attendees
      );

      // Update event with new attendee IDs
      await eventRef.update({
        attendees: attendeeIds,
        updatedAt: new Date()
      });

      console.log(`✅ Attendees synced: ${attendeeIds.length} total`);
    }

    // Fetch and return updated event
    const updatedDoc = await eventRef.get();
    const data = updatedDoc.data() as CalendarEvent;

    console.log(`✅ Event update complete: ${eventId}`);

    return {
      ...data,
      startTime: data.startTime instanceof Date ? data.startTime : (data.startTime as any).toDate(),
      endTime: data.endTime instanceof Date ? data.endTime : (data.endTime as any).toDate(),
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('❌ Error updating event:', error);
    throw new Error('Failed to update event');
  }
}
