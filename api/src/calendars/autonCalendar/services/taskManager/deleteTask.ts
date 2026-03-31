import { firestore } from '../../../../config/firebase';

/**
 * Delete a task
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param taskId - The task ID
 * @returns True if deleted, false if not found
 */
export async function deleteTask(
  tenantId: string,
  calendarId: string,
  taskId: string
): Promise<boolean> {
  try {
    const taskRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('tasks')
      .doc(taskId);

    const doc = await taskRef.get();

    if (!doc.exists) {
      return false;
    }

    await taskRef.delete();

    console.log(`✅ Task deleted: ${taskId}`);

    return true;
  } catch (error) {
    console.error('❌ Error deleting task:', error);
    throw new Error('Failed to delete task');
  }
}
