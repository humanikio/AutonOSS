import { firestore } from '../../../../config/firebase';
import { Calendar } from './createCalendar';

export interface UpdateCalendarInput {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: {
    timezone?: string;
    workingHours?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Update a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param input - Update data
 * @returns The updated calendar or null if not found
 */
export async function updateCalendar(
  tenantId: string,
  calendarId: string,
  input: UpdateCalendarInput
): Promise<Calendar | null> {
  try {
    const calendarRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId);

    // Check if calendar exists
    const doc = await calendarRef.get();
    if (!doc.exists) {
      console.log(`Calendar not found: ${calendarId} for tenant ${tenantId}`);
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

    await calendarRef.update(updateData);

    // Fetch and return updated calendar
    const updatedDoc = await calendarRef.get();
    const data = updatedDoc.data() as Calendar;

    console.log(` Calendar updated successfully: ${calendarId} for tenant ${tenantId}`);

    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate()
    };
  } catch (error) {
    console.error('Error updating calendar:', error);
    throw new Error('Failed to update calendar');
  }
}
