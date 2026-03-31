import { firestore } from '../../../../config/firebase';
import { Attendee } from './addAttendees';

/**
 * Get all attendees for an event
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @returns Array of attendees
 */
export async function getAttendees(
  tenantId: string,
  calendarId: string,
  eventId: string
): Promise<Attendee[]> {
  try {
    const attendeesRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId)
      .collection('attendees')
      .orderBy('createdAt', 'asc');

    const snapshot = await attendeesRef.get();

    if (snapshot.empty) {
      console.log(`No attendees found for event ${eventId}`);
      return [];
    }

    const attendees: Attendee[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Attendee;
      return {
        ...data,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
      };
    });

    console.log(`✅ Found ${attendees.length} attendees for event ${eventId}`);

    return attendees;
  } catch (error) {
    console.error('Error getting attendees:', error);
    throw new Error('Failed to get attendees');
  }
}

/**
 * Get a single attendee by ID
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param eventId - The event ID
 * @param attendeeId - The attendee ID
 * @returns The attendee or null if not found
 */
export async function getAttendee(
  tenantId: string,
  calendarId: string,
  eventId: string,
  attendeeId: string
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

    const doc = await attendeeRef.get();

    if (!doc.exists) {
      console.log(`Attendee not found: ${attendeeId} for event ${eventId}`);
      return null;
    }

    const data = doc.data() as Attendee;

    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('Error getting attendee:', error);
    throw new Error('Failed to get attendee');
  }
}
