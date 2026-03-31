/**
 * Event Tool
 * Handler for event-related operations
 * Routes to eventService for actual execution
 */

import { processEvent } from '../services/eventService';

export interface EventToolContext {
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
 * Event Tool Handler
 * Receives context from brain and delegates to eventService
 *
 * @param toolContext - Context from brain's tool output
 * @param executionContext - Execution context (tenant, chat, calendar)
 * @returns Result from event execution
 */
export async function eventTool(
  toolContext: EventToolContext,
  executionContext: ToolExecutionContext
): Promise<any> {

  console.log(`\n=' EVENT TOOL HANDLER`);
  console.log(`   User Request: ${toolContext.userRequest}`);
  console.log(`   Parameters:`, JSON.stringify(toolContext.parameters, null, 2));
  console.log(`   Context:`, {
    tenantId: executionContext.tenantId,
    chatId: executionContext.chatId,
    calendarId: executionContext.calendarId
  });

  // Delegate to service
  const result = await processEvent(toolContext, executionContext);

  console.log(`   Result:`, result);

  return result;
}
