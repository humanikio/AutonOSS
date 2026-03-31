import { firestore } from '../../../../config/firebase';
import { Task } from './createTask';

/**
 * Read a single task by ID
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param taskId - The task ID
 * @returns The task or null if not found
 */
export async function readTask(
  tenantId: string,
  calendarId: string,
  taskId: string
): Promise<Task | null> {
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
      return null;
    }

    const data = doc.data();

    // Convert Firestore Timestamps to Date objects
    return {
      ...data,
      dueDate: data?.dueDate?.toDate?.() || data?.dueDate,
      dueTime: data?.dueTime?.toDate?.() || data?.dueTime,
      startDate: data?.startDate?.toDate?.() || data?.startDate,
      completedAt: data?.completedAt?.toDate?.() || data?.completedAt,
      recurrence: data?.recurrence ? {
        ...data.recurrence,
        endDate: data.recurrence.endDate?.toDate?.() || data.recurrence.endDate
      } : undefined,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt
    } as Task;
  } catch (error) {
    console.error('❌ Error reading task:', error);
    throw new Error('Failed to read task');
  }
}
