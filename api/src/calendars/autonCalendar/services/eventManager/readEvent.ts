import { firestore } from '../../../../config/firebase';
import { CalendarEvent } from './createEvent';

/**
 * Get a single event by ID
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @returns The event or null if not found
 */
export async function readEvent(
  tenantId: string,
  calendarId: string,
  eventId: string
): Promise<CalendarEvent | null> {
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

    const doc = await eventRef.get();

    if (!doc.exists) {
      console.log(`Event not found: ${eventId} for calendar ${calendarId}`);
      return null;
    }

    const data = doc.data() as CalendarEvent;

    // Convert Firestore Timestamps to Date objects
    return {
      ...data,
      startTime: data.startTime instanceof Date ? data.startTime : (data.startTime as any).toDate(),
      endTime: data.endTime instanceof Date ? data.endTime : (data.endTime as any).toDate(),
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('Error reading event:', error);
    throw new Error('Failed to read event');
  }
}
