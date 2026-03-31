import { firestore } from '../../../../config/firebase';

/**
 * Remove an attendee from an event
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @param attendeeId - The attendee ID
 * @returns True if deleted, false if not found
 */
export async function removeAttendee(
  tenantId: string,
  calendarId: string,
  eventId: string,
  attendeeId: string
): Promise<boolean> {
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
      return false;
    }

    // Delete the attendee
    await attendeeRef.delete();

    console.log(`✅ Attendee removed successfully: ${attendeeId} from event ${eventId}`);

    return true;
  } catch (error) {
    console.error('Error removing attendee:', error);
    throw new Error('Failed to remove attendee');
  }
}
