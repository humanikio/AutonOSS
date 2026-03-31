/**
 * Process ToDo Queue
 * Loops through todos sequentially and executes them
 */

import { getCurrentToDo } from '../state/todoManager';
import { markToDoProcessing, completeToDoAndAdvance, handleToDoFailure } from '../state/todoManager';
import { taskTool, type TaskToolContext } from '../tools/taskTool';
import { eventTool, type EventToolContext } from '../tools/eventTool';
import type { ToDo } from '../state/todoManager';

export interface ProcessToDoQueueInput {
  tenantId: string;
  cycleId: string;
  chatId: string;
  calendarId?: string;
}

export interface ToolExecutionContext {
  tenantId: string;
  chatId: string;
  calendarId?: string;
}

/**
 * Process the todo queue for a cycle
 * Executes todos sequentially until none remain
 *
 * @param input - Queue processing input
 */
export async function processToDoQueue(input: ProcessToDoQueueInput): Promise<void> {
  const { tenantId, cycleId, chatId, calendarId } = input;

  console.log(`\n�  Starting ToDo Queue Processor for cycle ${cycleId}`);

  let todoCount = 0;

  while (true) {
    // Get current todo
    const todo = await getCurrentToDo(tenantId, cycleId);

    if (!todo) {
      console.log(`\n All todos completed! (${todoCount} total)`);
      break;
    }

    todoCount++;
    console.log(`\n=� Processing ${todo.todoId} (${todoCount})`);
    console.log(`   Tool: ${todo.toolName}`);
    console.log(`   Intent: ${todo.intent}`);

    try {
      // Mark as processing
      await markToDoProcessing(tenantId, cycleId, todo.todoId);

      // Execute the tool
      const result = await executeTool(todo, {
        tenantId,
        chatId,
        calendarId
      });

      console.log(` ${todo.todoId} completed successfully`);

      // Mark complete and advance to next
      await completeToDoAndAdvance(tenantId, cycleId, todo.todoId, result);

    } catch (error: any) {
      console.error(`L ${todo.todoId} failed:`, error.message);

      // Handle failure (retry or skip)
      await handleToDoFailure(tenantId, cycleId, todo.todoId, error.message);

      // Check if we should continue or stop
      const currentTodo = await getCurrentToDo(tenantId, cycleId);
      if (!currentTodo) {
        console.log(`\n�  Queue processing stopped after failure`);
        break;
      }
    }
  }

  console.log(`\n ToDo Queue Processing Complete\n`);
}

/**
 * Execute a specific tool based on the todo
 *
 * @param todo - The todo to execute
 * @param context - Execution context
 * @returns Result from tool execution
 */
async function executeTool(
  todo: ToDo,
  context: ToolExecutionContext
): Promise<any> {

  console.log(`\n=' Executing tool: ${todo.toolName}`);

  switch (todo.toolName) {
    case 'taskTool':
      return await taskTool(todo.context as TaskToolContext, context);

    case 'eventTool':
      return await eventTool(todo.context as EventToolContext, context);

    default:
      throw new Error(`Unknown tool: ${todo.toolName}`);
  }
}
