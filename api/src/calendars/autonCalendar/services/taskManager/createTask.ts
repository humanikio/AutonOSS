import { firestore } from '../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface Task {
  taskId: string;
  calendarId: string;
  tenantId: string;
  taskName: string;
  description?: string;

  // Time flexibility - all optional
  dueDate?: Date;
  dueTime?: Date;
  startDate?: Date;
  estimatedDuration?: number; // Minutes

  // Task-specific fields
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: Date;

  // Relationships
  assignees?: string[]; // Array of assignee IDs
  primaryAssigneeId?: string | null;
  parentTaskId?: string | null; // For subtasks
  linkedEventId?: string | null; // Optional link to related event

  // Organization
  tags?: string[];
  checklistItems?: {
    id: string;
    text: string;
    completed: boolean;
  }[];

  // Recurrence (like events)
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };

  // Reminders
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];

  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  taskName: string;
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
 * Create a new task for a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param input - Task creation data
 * @returns The created task
 */
export async function createTask(
  tenantId: string,
  calendarId: string,
  input: CreateTaskInput
): Promise<Task> {
  try {
    const taskId = uuidv4();
    const now = new Date();

    console.log(`✅ Creating task: ${input.taskName} (${taskId})`);

    // Validate dueTime requires dueDate
    if (input.dueTime && !input.dueDate) {
      throw new Error('dueDate is required when dueTime is set');
    }

    const task: Task = {
      taskId,
      calendarId,
      tenantId,
      taskName: input.taskName,
      description: input.description,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      startDate: input.startDate,
      estimatedDuration: input.estimatedDuration,
      priority: input.priority || 'medium',
      status: input.status || 'todo',
      assignees: input.assignees || [],
      primaryAssigneeId: input.assignees?.[0] || null,
      parentTaskId: input.parentTaskId || null,
      linkedEventId: input.linkedEventId || null,
      tags: input.tags || [],
      checklistItems: input.checklistItems || [],
      recurrence: input.recurrence,
      reminders: input.reminders || [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    const taskRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('tasks')
      .doc(taskId);

    await taskRef.set(task);

    console.log(`✅ Task created: ${taskId}`);

    return task;
  } catch (error) {
    console.error('❌ Error creating task:', error);
    throw new Error('Failed to create task');
  }
}
