import { firestore } from '../../../../config/firebase';
import { Attendee, AttendeeStatus, AttendeeRole } from './addAttendees';

export interface UpdateAttendeeInput {
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: AttendeeRole;
  status?: AttendeeStatus;
  metadata?: Record<string, any>;
}

/**
 * Update an attendee
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @param attendeeId - The attendee ID
 * @param input - Update data
 * @returns The updated attendee or null if not found
 */
export async function updateAttendee(
  tenantId: string,
  calendarId: string,
  eventId: string,
  attendeeId: string,
  input: UpdateAttendeeInput
): Promise<Attendee | null> {
  try {
    const attendeeRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId)
      .collection('attendees')
      .doc(attendeeId);

    // Check if attendee exists
    const doc = await attendeeRef.get();
    if (!doc.exists) {
      console.log(`Attendee not found: ${attendeeId} for event ${eventId}`);
      return null;
    }

    // Prepare update data
    const updateData: any = {
      ...input,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await attendeeRef.update(updateData);

    // Fetch and return updated attendee
    const updatedDoc = await attendeeRef.get();
    const data = updatedDoc.data() as Attendee;

    console.log(`✅ Attendee updated successfully: ${attendeeId} for event ${eventId}`);

    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('Error updating attendee:', error);
    throw new Error('Failed to update attendee');
  }
}
