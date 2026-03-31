/**
 * Get Tasks Handler Adapter
 * Normalizes LLM output and calls getTasks service
 */

import { getTasks, Task } from '../../../../services/taskManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from '../../../tools/taskTool';

export interface GetTasksHandlerParams {
  // No parameters needed - gets all tasks for calendar
}

export interface GetTasksHandlerResult {
  success: boolean;
  tasks?: Task[];
  count?: number;
  message: string;
  error?: string;
}

/**
 * Get Tasks Handler
 * Adapter that calls getTasks service to retrieve all tasks
 */
export async function getTasksHandler(
  params: GetTasksHandlerParams,
  context: ToolExecutionContext
): Promise<GetTasksHandlerResult> {
  try {
    console.log(`\n=📋 GET TASKS HANDLER`);

    if (!context.calendarId) {
      throw new Error('calendarId is required from context');
    }

    // Post pending message
    await postPendingToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'search',
      message: `Searching for tasks...`
    });

    // Call actual service
    const tasks = await getTasks(
      context.tenantId,
      context.calendarId
    );

    console.log(`✓ Retrieved ${tasks.length} task(s)`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'search',
      message: `Found ${tasks.length} task${tasks.length !== 1 ? 's' : ''}!`,
      count: tasks.length
    });

    return {
      success: true,
      tasks,
      count: tasks.length,
      message: `Retrieved ${tasks.length} task(s)`
    };

  } catch (error: any) {
    console.error(`❌ Get tasks handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'task',
      action: 'search',
      message: `Failed to search for tasks`,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to get tasks',
      error: error.message
    };
  }
}
