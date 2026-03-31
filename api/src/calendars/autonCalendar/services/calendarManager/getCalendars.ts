import { firestore } from '../../../../config/firebase';
import { Calendar } from './createCalendar';

/**
 * Get all calendars for a tenant
 * @param tenantId - The tenant ID
 * @returns Array of calendars
 */
export async function getCalendars(tenantId: string): Promise<Calendar[]> {
  try {
    const calendarsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .orderBy('createdAt', 'desc');

    const snapshot = await calendarsRef.get();

    if (snapshot.empty) {
      console.log(`No calendars found for tenant ${tenantId}`);
      return [];
    }

    const calendars: Calendar[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Calendar;
      return {
        ...data,
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
      };
    });

    console.log(` Found ${calendars.length} calendars for tenant ${tenantId}`);

    return calendars;
  } catch (error) {
    console.error('Error getting calendars:', error);
    throw new Error('Failed to get calendars');
  }
}
