/**
 * Update Task Handler Adapter
 * Normalizes LLM output and calls updateTask service
 */

import { updateTask, UpdateTaskInput } from '../../../../services/taskManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from '../../../tools/taskTool';

export interface UpdateTaskHandlerParams {
  taskId: string;
  taskName?: string;
  description?: string;
  dueDate?: string; // ISO 8601
  dueTime?: string; // ISO 8601
  startDate?: string; // ISO 8601
  estimatedDuration?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
  assignees?: string[];
  parentTaskId?: string;
  linkedEventId?: string;
  tags?: string[];
  checklistItems?: { id: string; text: string; completed: boolean }[];
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string; // ISO 8601
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskHandlerResult {
  success: boolean;
  taskId?: string;
  message: string;
  error?: string;
}

/**
 * Update Task Handler
 * Adapter that normalizes LLM output and calls updateTask service
 */
export async function updateTaskHandler(
  params: UpdateTaskHandlerParams,
  context: ToolExecutionContext
): Promise<UpdateTaskHandlerResult> {
  try {
    console.log(`\n=✏️ UPDATE TASK HANDLER`);
    console.log(`   Task ID: ${params.taskId}`);

    // Validate required fields
    if (!params.taskId) {
      throw new Error('taskId is required');
    }

    if (!context.calendarId) {
      throw new Error('calendarId is required from context');
    }

    // Post pending message
    await postPendingToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'update',
      message: `Updating task...`,
      entityId: params.taskId
    });

    // Normalize dates (convert ISO strings to Date objects)
    const input: UpdateTaskInput = {
      taskName: params.taskName,
      description: params.description,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      dueTime: params.dueTime ? new Date(params.dueTime) : undefined,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      estimatedDuration: params.estimatedDuration,
      priority: params.priority,
      status: params.status,
      assignees: params.assignees,
      parentTaskId: params.parentTaskId,
      linkedEventId: params.linkedEventId,
      tags: params.tags,
      checklistItems: params.checklistItems,
      recurrence: params.recurrence ? {
        frequency: params.recurrence.frequency,
        interval: params.recurrence.interval,
        endDate: params.recurrence.endDate ? new Date(params.recurrence.endDate) : undefined
      } : undefined,
      reminders: params.reminders,
      metadata: params.metadata
    };

    // Call actual service
    const task = await updateTask(
      context.tenantId,
      context.calendarId,
      params.taskId,
      input
    );

    if (!task) {
      throw new Error(`Task not found: ${params.taskId}`);
    }

    console.log(`✓ Task updated: ${task.taskId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'update',
      message: `Updated task "${task.taskName}"!`,
      entityId: task.taskId,
      entityType: 'task'
    });

    return {
      success: true,
      taskId: task.taskId,
      message: `Task "${task.taskName}" updated successfully`
    };

  } catch (error: any) {
    console.error(`❌ Update task handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'update',
      message: `Failed to update task`,
      entityId: params.taskId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to update task',
      error: error.message
    };
  }
}
