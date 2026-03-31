/**
 * Create Task Handler Adapter
 * Normalizes LLM output and calls createTask service
 */

import { createTask, CreateTaskInput } from '../../../../services/taskManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from '../../../tools/taskTool';

export interface CreateTaskHandlerParams {
  taskName: string;
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

export interface CreateTaskHandlerResult {
  success: boolean;
  taskId?: string;
  taskName?: string;
  message: string;
  error?: string;
}

/**
 * Create Task Handler
 * Adapter that normalizes LLM output and calls createTask service
 */
export async function createTaskHandler(
  params: CreateTaskHandlerParams,
  context: ToolExecutionContext
): Promise<CreateTaskHandlerResult> {
  try {
    console.log(`\n=📝 CREATE TASK HANDLER`);
    console.log(`   Task Name: ${params.taskName}`);
    console.log(`   Priority: ${params.priority || 'medium'}`);

    // Validate required fields
    if (!params.taskName) {
      throw new Error('taskName is required');
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
      action: 'create',
      message: `Creating task "${params.taskName}"...`
    });

    // Normalize dates (convert ISO strings to Date objects)
    const input: CreateTaskInput = {
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
    const task = await createTask(
      context.tenantId,
      context.calendarId,
      input
    );

    console.log(`✓ Task created: ${task.taskId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'create',
      message: `Created task "${task.taskName}"!`,
      entityId: task.taskId,
      entityType: 'task'
    });

    return {
      success: true,
      taskId: task.taskId,
      taskName: task.taskName,
      message: `Task "${task.taskName}" created successfully`
    };

  } catch (error: any) {
    console.error(`❌ Create task handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'create',
      message: `Failed to create task "${params.taskName}"`,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to create task',
      error: error.message
    };
  }
}
