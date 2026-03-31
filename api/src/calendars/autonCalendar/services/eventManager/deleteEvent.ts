import { firestore } from '../../../../config/firebase';
import { attendeeOrchestrator } from '../../utils/attendeeOrchestrator';

/**
 * Delete an event (with cascade delete of attendees)
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @returns True if deleted, false if not found
 */
export async function deleteEvent(
  tenantId: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    console.log(`📅 Deleting event: ${eventId}`);

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
      return false;
    }

    // 1. Delete all attendees first (cascade delete)
    console.log(`🗑️ Cascade deleting attendees for event ${eventId}`);
    const deletedCount = await attendeeOrchestrator.deleteAllEventAttendees(
      tenantId,
      calendarId,
      eventId
    );

    if (deletedCount > 0) {
      console.log(`✅ Deleted ${deletedCount} attendees`);
    }

    // 2. Delete the event document
    await eventRef.delete();

    console.log(`✅ Event deleted successfully: ${eventId} for calendar ${calendarId}`);

    return true;
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
}
