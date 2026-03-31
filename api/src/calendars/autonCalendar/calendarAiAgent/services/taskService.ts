/**
 * Task Service - Main Orchestrator
 * Multi-stage LLM architecture for task operations
 *
 * Flow:
 * 1. Build prompt with basic handler descriptions
 * 2. Review operations needed (LLM call 1)
 * 3. Pull detailed contexts for needed handlers
 * 4. Generate handler JSONs (LLM call 2)
 * 5. Execute handler queue
 */

import { buildPrompt } from './taskService/promptBuilder';
import { reviewPrompt } from './taskService/taskBrain/reviewPrompt';
import { pullContext } from './taskService/taskBrain/pullContext';
import { generateHandlerJsons } from './taskService/taskBrain/generateHandlerJsons/index';
import { executeHandlerQueue } from './taskService/utils/handlerQueueExecutor';
import { createMessage } from '../state/chats/createMessage';
import type { TaskToolContext, ToolExecutionContext } from '../tools/taskTool';
import type { Task } from '../../services/taskManager/createTask';
import type { CalendarEvent } from '../../services/eventManager/createEvent';

export interface ProcessTaskResult {
  success: boolean;
  message: string;
  results?: any[];
  error?: string;
}

/**
 * Format handler results into user-friendly message
 * Used for read/search operations that return data to display
 */
function formatResultsForUser(results: any[], userRequest: string): string {
  let message = '';
  const allTasks: Task[] = [];
  const allEvents: CalendarEvent[] = [];
  let singleTask: Task | undefined;

  // Collect all tasks and events from results
  results.forEach(result => {
    if (result.tasks && Array.isArray(result.tasks)) {
      allTasks.push(...result.tasks);
    }
    if (result.task) {
      singleTask = result.task;
    }
    if (result.events && Array.isArray(result.events)) {
      allEvents.push(...result.events);
    }
  });

  // Format single task (readTask)
  if (singleTask) {
    const due = singleTask.dueDate
      ? new Date(singleTask.dueDate).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })
      : 'No due date';

    message += `**${singleTask.taskName}**\n`;
    message += `Due: ${due}\n`;
    if (singleTask.description) {
      message += `Description: ${singleTask.description}\n`;
    }
    message += `Status: ${singleTask.status}\n`;
    if (singleTask.priority) {
      message += `Priority: ${singleTask.priority}\n`;
    }
    return message;
  }

  // Format multiple tasks
  if (allTasks.length > 0) {
    message += `**Tasks** (${allTasks.length}):\n\n`;
    allTasks.forEach(task => {
      const due = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        : 'No due';

      const time = task.dueTime
        ? ` at ${new Date(task.dueTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}`
        : '';

      const priority = task.priority ? ` [${task.priority}]` : '';
      const status = task.status === 'completed' ? ' ✓' : '';

      message += `• ${task.taskName}${priority}${status} - ${due}${time}\n`;
    });
    message += '\n';
  }

  // Format events
  if (allEvents.length > 0) {
    message += `**Events** (${allEvents.length}):\n\n`;
    allEvents.forEach(event => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);

      const date = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });

      const timeRange = `${start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })} - ${end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      })}`;

      message += `• ${event.eventName} - ${date} ${timeRange}\n`;
      if (event.location) {
        message += `  Location: ${event.location}\n`;
      }
    });
  }

  // If nothing found
  if (allTasks.length === 0 && allEvents.length === 0 && !singleTask) {
    message = `I didn't find any items matching your request.`;
  }

  return message.trim();
}

/**
 * Process task operation using multi-stage LLM architecture
 *
 * @param toolContext - Context from taskTool (intent, user request, parameters)
 * @param executionContext - Execution context (tenantId, chatId, calendarId)
 * @returns Result of operation(s)
 */
export async function processTask(
  toolContext: TaskToolContext,
  executionContext: ToolExecutionContext
): Promise<ProcessTaskResult> {

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 TASK SERVICE - STARTING`);
  console.log(`${'='.repeat(80)}`);
  console.log(`User Request: ${toolContext.userRequest}`);
  if (toolContext.intent) {
    console.log(`Intent: ${toolContext.intent}`);
  }
  console.log(`Calendar ID: ${executionContext.calendarId}`);
  console.log(`Brain-provided parameters:`, JSON.stringify(toolContext.parameters, null, 2));

  try {
    // ======================
    // STAGE 1: Build Prompt
    // ======================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STAGE 1: Building Prompt with Basic Handler Descriptions`);
    console.log(`${'='.repeat(80)}`);

    const prompt = await buildPrompt({
      userIntent: toolContext.intent || toolContext.userRequest,
      userRequest: toolContext.userRequest,
      calendarId: executionContext.calendarId || '',
      brainProvidedContext: toolContext.parameters  // Pass brain's discovered context
    });

    // ==========================
    // STAGE 2: Review Operations
    // ==========================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STAGE 2: Reviewing Operations (LLM Call #1)`);
    console.log(`${'='.repeat(80)}`);

    const reviewOutput = await reviewPrompt(prompt);

    // Stage 2 message no longer posted - brain already sent high-level message
    // Only Stage 4 (execution) messages will be posted to avoid duplication

    if (reviewOutput.operations.length === 0) {
      console.log(`\n⚠️  No operations determined - returning early`);
      return {
        success: true,
        message: 'No task operations needed for this request',
        results: []
      };
    }

    // ==========================
    // STAGE 3: Pull Contexts
    // ==========================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STAGE 3: Pulling Detailed Contexts (Handler + Calendar)`);
    console.log(`${'='.repeat(80)}`);

    const detailedContext = await pullContext(
      executionContext.tenantId,
      executionContext.chatId || '',
      executionContext.calendarId || '',
      reviewOutput
    );

    // ===============================
    // STAGE 4: Generate Handler JSONs
    // ===============================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STAGE 4: Generating Handler JSONs (LLM Call #2)`);
    console.log(`${'='.repeat(80)}`);

    const handlerJsons = await generateHandlerJsons(
      reviewOutput,
      detailedContext,
      toolContext.parameters  // Pass brain's discovered context
    );

    // Post Stage 4 message to user
    console.log(`\n📤 Posting Stage 4 message to chat...`);
    await createMessage(executionContext.tenantId, {
      role: 'assistant',
      content: handlerJsons.message,
      calendarId: executionContext.calendarId,
      metadata: {
        stage: 'generateHandlerJsons',
        handlerCount: handlerJsons.handlerCalls.length
      }
    });
    console.log(`✅ Stage 4 message posted`);

    if (handlerJsons.handlerCalls.length === 0) {
      console.log(`\n⚠️  No handler calls generated - returning early`);
      return {
        success: true,
        message: 'No handler calls generated',
        results: []
      };
    }

    // ============================
    // STAGE 5: Execute Handlers
    // ============================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`STAGE 5: Executing Handler Queue`);
    console.log(`${'='.repeat(80)}`);

    const results = await executeHandlerQueue(handlerJsons.handlerCalls, executionContext);

    // ====================================
    // STAGE 6: Post Results Summary (for read operations)
    // ====================================
    const hasDataToDisplay = results.some(r => r.tasks || r.events || r.task);

    if (hasDataToDisplay) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`STAGE 6: Formatting and Posting Results`);
      console.log(`${'='.repeat(80)}`);

      const formattedResults = formatResultsForUser(results, toolContext.userRequest);

      console.log(`📤 Posting results summary to user...`);
      await createMessage(executionContext.tenantId, {
        role: 'assistant',
        content: formattedResults,
        calendarId: executionContext.calendarId,
        metadata: {
          stage: 'resultsSummary',
          hasData: true
        }
      });
      console.log(`✅ Results posted to user`);
    }

    // ============================
    // Final Summary
    // ============================
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TASK SERVICE - COMPLETE`);
    console.log(`${'='.repeat(80)}`);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`Total Handlers: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    return {
      success: successCount > 0,
      message: `Completed ${successCount}/${results.length} task operation(s) successfully`,
      results
    };

  } catch (error: any) {
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ TASK SERVICE ERROR`);
    console.error(`${'='.repeat(80)}`);
    console.error(error.message);
    console.error(error.stack);

    return {
      success: false,
      message: 'Task service failed',
      error: error.message
    };
  }
}
