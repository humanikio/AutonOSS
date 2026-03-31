import { firestore } from '../../../../config/firebase';
import { Calendar } from './createCalendar';

/**
 * Get a single calendar by ID
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @returns The calendar or null if not found
 */
export async function readCalendar(
  tenantId: string,
  calendarId: string
): Promise<Calendar | null> {
  try {
    const calendarRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId);

    const doc = await calendarRef.get();

    if (!doc.exists) {
      console.log(`Calendar not found: ${calendarId} for tenant ${tenantId}`);
      return null;
    }

    const data = doc.data() as Calendar;

    // Convert Firestore Timestamps to Date objects
    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('Error reading calendar:', error);
    throw new Error('Failed to read calendar');
  }
}
