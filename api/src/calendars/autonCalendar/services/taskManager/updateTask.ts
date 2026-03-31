import { firestore } from '../../../../config/firebase';
import { Task, TaskPriority, TaskStatus } from './createTask';

export interface UpdateTaskInput {
  taskName?: string;
  description?: string;
  dueDate?: Date;
  dueTime?: Date;
  startDate?: Date;
  estimatedDuration?: number;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignees?: string[];
  parentTaskId?: string;
  linkedEventId?: string;
  tags?: string[];
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

/**
 * Update a task
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param taskId - The task ID
 * @param input - Updated task data
 * @returns The updated task or null if not found
 */
export async function updateTask(
  tenantId: string,
  calendarId: string,
  taskId: string,
  input: UpdateTaskInput
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

    // Validate dueTime requires dueDate
    if (input.dueTime && !input.dueDate) {
      throw new Error('dueDate is required when dueTime is set');
    }

    const updates: any = {
      ...input,
      updatedAt: new Date()
    };

    // Handle status change to completed
    if (input.status === 'completed') {
      updates.completedAt = new Date();
    }

    // Update primaryAssigneeId if assignees changed
    if (input.assignees) {
      updates.primaryAssigneeId = input.assignees[0] || null;
    }

    await taskRef.update(updates);

    // Fetch and return updated task
    const updatedDoc = await taskRef.get();
    const data = updatedDoc.data();

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
    console.error('❌ Error updating task:', error);
    throw new Error('Failed to update task');
  }
}
