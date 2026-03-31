/**
 * Task Brain - Pull Context (Stage 2 - NO LLM)
 * Loads detailed handler contexts AND calendar context based on needs
 */

import { CREATE_TASK_CONTEXT } from '../promptBuilder/taskHandlerContext/createTask';
import { UPDATE_TASK_CONTEXT } from '../promptBuilder/taskHandlerContext/updateTask';
import { DELETE_TASK_CONTEXT } from '../promptBuilder/taskHandlerContext/deleteTask';
import { READ_TASK_CONTEXT } from '../promptBuilder/taskHandlerContext/readTask';
import { GET_TASKS_CONTEXT } from '../promptBuilder/taskHandlerContext/getTasks';
import { fetchCalendarContext, formatCalendarContextForLLM } from '../../shared/calendarContext';
import { postPendingToolMessage, postSuccessToolMessage } from '../../shared/postToolMessage';
import type { ReviewPromptOutput } from './reviewPrompt';

/**
 * Pull detailed handler contexts AND calendar context
 * NO LLM - Pure code that:
 * 1. Fetches calendar context if needed (tasks/events from calendar)
 * 2. Imports only the handler contexts we need
 *
 * @param tenantId - Tenant ID for calendar context fetching
 * @param chatId - Chat ID for posting tool messages
 * @param calendarId - Calendar ID for context fetching
 * @param reviewOutput - Output from reviewPrompt (operations needed)
 * @returns Combined string with calendar context and handler contexts
 */
export async function pullContext(
  tenantId: string,
  chatId: string,
  calendarId: string,
  reviewOutput: ReviewPromptOutput
): Promise<string> {
  console.log(`\n=📥 Pulling Detailed Contexts`);

  const allContexts: string[] = [];

  // PART 1: Fetch calendar context if needed
  if (reviewOutput.contextRequest.needed) {
    console.log(`\n📅 Fetching Calendar Context`);

    if (!calendarId) {
      console.warn(`⚠️  Calendar context requested but no calendarId provided`);
    } else {
      // Post pending message
      await postPendingToolMessage({
        tenantId,
        chatId,
        calendarId,
        toolType: 'calendar',
        action: 'fetch',
        message: `Fetching calendar context...`
      });

      try {
        const dateRange = reviewOutput.contextRequest.dateRange!;

        // Parse dates and handle single-day ranges
        const startDate = new Date(dateRange.start);
        let endDate = new Date(dateRange.end);

        // If start and end are the same instant, extend end to end-of-day
        if (startDate.getTime() === endDate.getTime()) {
          endDate = new Date(endDate);
          endDate.setUTCHours(23, 59, 59, 999);
        }

        const calendarContextData = await fetchCalendarContext(tenantId, calendarId, {
          dateRange: {
            start: startDate,
            end: endDate
          },
          includeTasks: reviewOutput.contextRequest.includeTasks ?? true,
          includeEvents: reviewOutput.contextRequest.includeEvents ?? false,
          taskFilters: reviewOutput.contextRequest.taskFilters as any // Type mismatch with 'urgent' - will be handled
        });

        const formattedContext = formatCalendarContextForLLM(calendarContextData);

        if (formattedContext) {
          allContexts.push(`
====================
CALENDAR CONTEXT
====================

${formattedContext}

Reasoning: ${reviewOutput.contextRequest.reasoning}
`);

          // Post success message
          await postSuccessToolMessage({
            tenantId,
            chatId,
            calendarId,
            toolType: 'calendar',
            action: 'fetch',
            message: `Found ${calendarContextData.tasks.length} task${calendarContextData.tasks.length !== 1 ? 's' : ''} and ${calendarContextData.events.length} event${calendarContextData.events.length !== 1 ? 's' : ''}!`,
            count: calendarContextData.tasks.length + calendarContextData.events.length
          });

          console.log(`✓ Calendar context fetched: ${calendarContextData.tasks.length} tasks, ${calendarContextData.events.length} events`);
        } else {
          console.log(`ℹ️  No calendar items found in requested range`);
        }
      } catch (error: any) {
        console.error(`❌ Error fetching calendar context:`, error.message);
        // Continue without calendar context - don't fail the whole operation
      }
    }
  } else {
    console.log(`ℹ️  No calendar context needed for this operation`);
  }

  // PART 2: Pull handler contexts
  console.log(`\n📋 Loading Handler Contexts`);
  const handlerContexts: string[] = [];
  const handlersSeen = new Set<string>();

  // Iterate through operations and pull unique handler contexts
  for (const operation of reviewOutput.operations) {
    const handler = operation.handler;

    // Skip if we've already added this handler's context
    if (handlersSeen.has(handler)) {
      continue;
    }

    handlersSeen.add(handler);

    // Load the appropriate context
    switch (handler) {
      case 'create':
        console.log(`    Loading createTaskHandler context`);
        handlerContexts.push(CREATE_TASK_CONTEXT);
        break;

      case 'update':
        console.log(`    Loading updateTaskHandler context`);
        handlerContexts.push(UPDATE_TASK_CONTEXT);
        break;

      case 'delete':
        console.log(`    Loading deleteTaskHandler context`);
        handlerContexts.push(DELETE_TASK_CONTEXT);
        break;

      case 'read':
        console.log(`    Loading readTaskHandler context`);
        handlerContexts.push(READ_TASK_CONTEXT);
        break;

      case 'getTasks':
        console.log(`    Loading getTasksHandler context`);
        handlerContexts.push(GET_TASKS_CONTEXT);
        break;

      default:
        console.warn(`   ⚠️  Unknown handler type: ${handler}`);
    }
  }

  console.log(`✓ Loaded ${handlerContexts.length} handler context(s)`);

  // Add handler contexts to all contexts
  if (handlerContexts.length > 0) {
    allContexts.push(handlerContexts.join('\n\n' + '='.repeat(80) + '\n\n'));
  }

  // Combine all contexts
  const combinedContext = allContexts.join('\n\n' + '='.repeat(80) + '\n\n');

  return combinedContext;
}
