import { firestore } from '../../../../config/firebase';
import { Task } from './createTask';

/**
 * Get all tasks for a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @returns Array of tasks
 */
export async function getTasks(
  tenantId: string,
  calendarId: string
): Promise<Task[]> {
  try {
    const tasksRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('tasks');

    const snapshot = await tasksRef.get();

    if (snapshot.empty) {
      return [];
    }

    const tasks: Task[] = snapshot.docs.map(doc => {
      const data = doc.data();

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
    });

    return tasks;
  } catch (error) {
    console.error('❌ Error getting tasks:', error);
    throw new Error('Failed to get tasks');
  }
}
