/**
 * Task Tool
 * Handler for task-related operations
 * Routes to taskService for actual execution
 */

import { processTask } from '../services/taskService';

export interface TaskToolContext {
  userRequest: string;
  intent?: string; // Optional - from brain's analysis
  parameters: Record<string, any>;
}

export interface ToolExecutionContext {
  tenantId: string;
  chatId: string;
  calendarId?: string;
}

/**
 * Task Tool Handler
 * Receives context from brain and delegates to taskService
 *
 * @param toolContext - Context from brain's tool output
 * @param executionContext - Execution context (tenant, chat, calendar)
 * @returns Result from task execution
 */
export async function taskTool(
  toolContext: TaskToolContext,
  executionContext: ToolExecutionContext
): Promise<any> {

  console.log(`\n=' TASK TOOL HANDLER`);
  console.log(`   User Request: ${toolContext.userRequest}`);
  console.log(`   Parameters:`, JSON.stringify(toolContext.parameters, null, 2));
  console.log(`   Context:`, {
    tenantId: executionContext.tenantId,
    chatId: executionContext.chatId,
    calendarId: executionContext.calendarId
  });

  // Delegate to service
  const result = await processTask(toolContext, executionContext);

  console.log(`   Result:`, result);

  return result;
}
