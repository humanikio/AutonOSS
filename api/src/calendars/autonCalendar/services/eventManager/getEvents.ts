import { firestore } from '../../../../config/firebase';
import { CalendarEvent } from './createEvent';

/**
 * Get all events for a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @returns Array of events
 */
export async function getEvents(
  tenantId: string,
  calendarId: string
): Promise<CalendarEvent[]> {
  try {
    const eventsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .orderBy('startTime', 'asc');

    const snapshot = await eventsRef.get();

    if (snapshot.empty) {
      console.log(`No events found for calendar ${calendarId}`);
      return [];
    }

    const events: CalendarEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data() as CalendarEvent;
      return {
        ...data,
        startTime: data.startTime instanceof Date ? data.startTime : (data.startTime as any).toDate(),
        endTime: data.endTime instanceof Date ? data.endTime : (data.endTime as any).toDate(),
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
      };
    });

    console.log(`✅ Found ${events.length} events for calendar ${calendarId}`);

    return events;
  } catch (error) {
    console.error('Error getting events:', error);
    throw new Error('Failed to get events');
  }
}
