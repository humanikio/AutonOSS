/**
 * Read Task Handler Adapter
 * Normalizes LLM output and calls readTask service
 */

import { readTask, Task } from '../../../../services/taskManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from '../../../tools/taskTool';

export interface ReadTaskHandlerParams {
  taskId: string;
}

export interface ReadTaskHandlerResult {
  success: boolean;
  task?: Task;
  message: string;
  error?: string;
}

/**
 * Read Task Handler
 * Adapter that normalizes LLM output and calls readTask service
 */
export async function readTaskHandler(
  params: ReadTaskHandlerParams,
  context: ToolExecutionContext
): Promise<ReadTaskHandlerResult> {
  try {
    console.log(`\n=📖 READ TASK HANDLER`);
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
      action: 'read',
      message: `Reading task...`,
      entityId: params.taskId
    });

    // Call actual service
    const task = await readTask(
      context.tenantId,
      context.calendarId,
      params.taskId
    );

    if (!task) {
      throw new Error(`Task not found: ${params.taskId}`);
    }

    console.log(`✓ Task retrieved: ${task.taskName}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'read',
      message: `Found task "${task.taskName}"!`,
      entityId: task.taskId,
      entityType: 'task'
    });

    return {
      success: true,
      task,
      message: `Task "${task.taskName}" retrieved successfully`
    };

  } catch (error: any) {
    console.error(`❌ Read task handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'read',
      message: `Failed to read task`,
      entityId: params.taskId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to read task',
      error: error.message
    };
  }
}
