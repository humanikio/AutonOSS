/**
 * Delete Task Handler Adapter
 * Normalizes LLM output and calls deleteTask service
 */

import { deleteTask } from '../../../../services/taskManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from '../../../tools/taskTool';

export interface DeleteTaskHandlerParams {
  taskId: string;
}

export interface DeleteTaskHandlerResult {
  success: boolean;
  taskId?: string;
  message: string;
  error?: string;
}

/**
 * Delete Task Handler
 * Adapter that normalizes LLM output and calls deleteTask service
 */
export async function deleteTaskHandler(
  params: DeleteTaskHandlerParams,
  context: ToolExecutionContext
): Promise<DeleteTaskHandlerResult> {
  try {
    console.log(`\n=🗑️ DELETE TASK HANDLER`);
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
      action: 'delete',
      message: `Deleting task...`,
      entityId: params.taskId
    });

    // Call actual service
    const deleted = await deleteTask(
      context.tenantId,
      context.calendarId,
      params.taskId
    );

    if (!deleted) {
      throw new Error(`Task not found: ${params.taskId}`);
    }

    console.log(`✓ Task deleted: ${params.taskId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'delete',
      message: `Deleted task!`,
      entityId: params.taskId,
      entityType: 'task'
    });

    return {
      success: true,
      taskId: params.taskId,
      message: `Task deleted successfully`
    };

  } catch (error: any) {
    console.error(`❌ Delete task handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'delete',
      message: `Failed to delete task`,
      entityId: params.taskId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to delete task',
      error: error.message
    };
  }
}
