/**
 * Handler Queue Executor Utility
 * Executes handler calls sequentially with error handling
 */

import { createTaskHandler, CreateTaskHandlerParams } from '../handlers/createTask';
import { updateTaskHandler, UpdateTaskHandlerParams } from '../handlers/updateTask';
import { deleteTaskHandler, DeleteTaskHandlerParams } from '../handlers/deleteTasks';
import { readTaskHandler, ReadTaskHandlerParams } from '../handlers/readTask';
import { getTasksHandler, GetTasksHandlerParams } from '../handlers/getTasks';
import type { HandlerCall } from '../taskBrain/generateHandlerJsons';
import type { ToolExecutionContext } from '../../../tools/taskTool';

/**
 * Execute a queue of handler calls sequentially
 *
 * @param handlerCalls - Array of handler calls to execute
 * @param context - Execution context (tenantId, chatId, calendarId)
 * @returns Array of results from each handler
 */
export async function executeHandlerQueue(
  handlerCalls: HandlerCall[],
  context: ToolExecutionContext
): Promise<any[]> {
  console.log(`\n🎯 Executing Handler Queue (${handlerCalls.length} handler(s))`);

  const results: any[] = [];

  for (let i = 0; i < handlerCalls.length; i++) {
    const call = handlerCalls[i];
    console.log(`\n[${i + 1}/${handlerCalls.length}] Executing: ${call.handler}`);

    try {
      const result = await executeHandler(call, context);
      results.push(result);

      if (result.success) {
        console.log(`✅ Handler ${i + 1} completed successfully`);
      } else {
        console.log(`⚠️  Handler ${i + 1} failed: ${result.error || result.message}`);
      }

    } catch (error: any) {
      console.error(`❌ Handler ${i + 1} threw error:`, error.message);

      results.push({
        success: false,
        message: `Handler execution failed`,
        error: error.message
      });
    }
  }

  console.log(`\n✅ Handler Queue Complete (${results.length} results)`);

  return results;
}

/**
 * Execute a single handler call
 *
 * @param call - Handler call with name and parameters
 * @param context - Execution context
 * @returns Result from handler
 */
async function executeHandler(
  call: HandlerCall,
  context: ToolExecutionContext
): Promise<any> {

  switch (call.handler) {
    case 'createTaskHandler':
      return await createTaskHandler(call.parameters as CreateTaskHandlerParams, context);

    case 'updateTaskHandler':
      return await updateTaskHandler(call.parameters as UpdateTaskHandlerParams, context);

    case 'deleteTaskHandler':
      return await deleteTaskHandler(call.parameters as DeleteTaskHandlerParams, context);

    case 'readTaskHandler':
      return await readTaskHandler(call.parameters as ReadTaskHandlerParams, context);

    case 'getTasksHandler':
      return await getTasksHandler(call.parameters as GetTasksHandlerParams, context);

    default:
      throw new Error(`Unknown handler: ${call.handler}`);
  }
}
