/**
 * Handler Queue Executor Utility
 * Executes handler calls sequentially with error handling
 */

import { createEventHandler, CreateEventHandlerParams } from '../handlers/createEvent';
import { updateEventHandler, UpdateEventHandlerParams } from '../handlers/updateEvent';
import { deleteEventHandler, DeleteEventHandlerParams } from '../handlers/deleteEvent';
import { readEventHandler, ReadEventHandlerParams } from '../handlers/readEvent';
import { getEventsHandler, GetEventsHandlerParams } from '../handlers/getEvents';
import type { HandlerCall } from '../eventBrain/generateHandlerJsons';
import type { ToolExecutionContext } from '../handlers/types';

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
    case 'createEventHandler':
      return await createEventHandler(call.parameters as CreateEventHandlerParams, context);

    case 'updateEventHandler':
      return await updateEventHandler(call.parameters as UpdateEventHandlerParams, context);

    case 'deleteEventHandler':
      return await deleteEventHandler(call.parameters as DeleteEventHandlerParams, context);

    case 'readEventHandler':
      return await readEventHandler(call.parameters as ReadEventHandlerParams, context);

    case 'getEventsHandler':
      return await getEventsHandler(call.parameters as GetEventsHandlerParams, context);

    default:
      throw new Error(`Unknown handler: ${call.handler}`);
  }
}
