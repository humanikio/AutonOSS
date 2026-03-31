/**
 * Event Service - Main Orchestrator
 * Multi-stage LLM architecture for event operations
 *
 * Flow:
 * 1. Build prompt with basic handler descriptions
 * 2. Review operations needed (LLM call 1)
 * 3. Pull detailed contexts for needed handlers
 * 4. Generate handler JSONs (LLM call 2)
 * 5. Execute handler queue
 */

import { buildPrompt } from './eventService/promptBuilder';
import { reviewPrompt } from './eventService/eventBrain/reviewPrompt';
import { pullContext } from './eventService/eventBrain/pullContext';
import { generateHandlerJsons } from './eventService/eventBrain/generateHandlerJsons/index';
import { executeHandlerQueue } from './eventService/utils/handlerQueueExecutor';
import { createMessage } from '../state/chats/createMessage';
import type { EventToolContext, ToolExecutionContext } from '../tools/eventTool';
import type { CalendarEvent } from '../../services/eventManager/createEvent';

export interface ProcessEventResult {
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
  const allEvents: CalendarEvent[] = [];
  let singleEvent: CalendarEvent | undefined;

  // Collect all events from results
  results.forEach(result => {
    if (result.events && Array.isArray(result.events)) {
      allEvents.push(...result.events);
    }
    if (result.event) {
      singleEvent = result.event;
    }
  });

  // Format single event (readEvent)
  if (singleEvent) {
    const start = new Date(singleEvent.startTime);
    const end = new Date(singleEvent.endTime);

    const date = start.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const timeRange = `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })}`;

    message += `**${singleEvent.eventName}**\n`;
    message += `Date: ${date}\n`;
    message += `Time: ${timeRange}\n`;
    if (singleEvent.location) {
      message += `Location: ${singleEvent.location}\n`;
    }
    if (singleEvent.description) {
      message += `Description: ${singleEvent.description}\n`;
    }
    return message;
  }

  // Format multiple events
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
  if (allEvents.length === 0 && !singleEvent) {
    message = `I didn't find any events matching your request.`;
  }

  return message.trim();
}

/**
 * Process event operation using multi-stage LLM architecture
 *
 * @param toolContext - Context from eventTool (intent, user request, parameters)
 * @param executionContext - Execution context (tenantId, chatId, calendarId)
 * @returns Result of operation(s)
 */
export async function processEvent(
  toolContext: EventToolContext,
  executionContext: ToolExecutionContext
): Promise<ProcessEventResult> {

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📅 EVENT SERVICE - STARTING`);
  console.log(`${'='.repeat(80)}`);
  console.log(`User Request: ${toolContext.userRequest}`);
  if (toolContext.intent) {
    console.log(`Intent: ${toolContext.intent}`);
  }
  console.log(`Calendar ID: ${executionContext.calendarId}`);

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
      calendarId: executionContext.calendarId || ''
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
        message: 'No event operations needed for this request',
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

    const handlerJsons = await generateHandlerJsons(reviewOutput, detailedContext);

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
    const hasDataToDisplay = results.some(r => r.events || r.event);

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
    console.log(`EVENT SERVICE - COMPLETE`);
    console.log(`${'='.repeat(80)}`);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`Total Handlers: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    return {
      success: successCount > 0,
      message: `Completed ${successCount}/${results.length} event operation(s) successfully`,
      results
    };

  } catch (error: any) {
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ EVENT SERVICE ERROR`);
    console.error(`${'='.repeat(80)}`);
    console.error(error.message);
    console.error(error.stack);

    return {
      success: false,
      message: 'Event service failed',
      error: error.message
    };
  }
}
