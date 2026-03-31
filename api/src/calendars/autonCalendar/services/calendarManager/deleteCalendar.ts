import { firestore } from '../../../../config/firebase';

/**
 * Delete a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @returns True if deleted, false if not found
 */
export async function deleteCalendar(
  tenantId: string,
  calendarId: string
): Promise<boolean> {
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
      return false;
    }

    // Delete the calendar
    await calendarRef.delete();

    console.log(` Calendar deleted successfully: ${calendarId} for tenant ${tenantId}`);

    return true;
  } catch (error) {
    console.error('Error deleting calendar:', error);
    throw new Error('Failed to delete calendar');
  }
}
