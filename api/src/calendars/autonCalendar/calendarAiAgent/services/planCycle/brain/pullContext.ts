/**
 * Brain Stage 2 - Pull Context
 * Fetches specific calendar context based on Stage 1 analysis
 */

import { fetchCalendarContext, formatCalendarContextForLLM } from '../../shared/calendarContext';
import { postPendingToolMessage, postSuccessToolMessage } from '../../shared/postToolMessage';
import type { BrainReviewOutput } from './reviewPrompt';

/**
 * Pull calendar context if needed
 * Fetches tasks and events based on Stage 1's analysis
 *
 * @param tenantId - Tenant ID
 * @param chatId - Chat ID for posting tool messages
 * @param calendarId - Calendar ID
 * @param reviewOutput - Output from Stage 1 (reviewPrompt)
 * @returns Formatted context string for LLM (empty if not needed)
 */
export async function pullContext(
  tenantId: string,
  chatId: string,
  calendarId: string | undefined,
  reviewOutput: BrainReviewOutput
): Promise<string> {
  console.log(`\n🧠 Brain Stage 2: Pulling Context`);

  const { contextRequest } = reviewOutput;

  // Skip if no context needed
  if (!contextRequest.needed) {
    console.log(`  ⏭️  No context needed - skipping`);
    return '';
  }

  // Skip if no calendarId provided
  if (!calendarId) {
    console.log(`  ⚠️  No calendar ID provided - skipping context fetch`);
    return '';
  }

  // Parse date range if provided
  let dateRange;
  if (contextRequest.dateRange) {
    const startDate = new Date(contextRequest.dateRange.start);
    let endDate = new Date(contextRequest.dateRange.end);

    // If start and end are the same day, extend end to end-of-day
    // This handles queries like "what do I have tomorrow?" where brain outputs "2025-12-07" to "2025-12-07"
    if (startDate.getTime() === endDate.getTime()) {
      // Set end to 23:59:59.999 UTC of the same day
      endDate = new Date(endDate);
      endDate.setUTCHours(23, 59, 59, 999);
      console.log(`  📅 Date range: ${contextRequest.dateRange.start} (single day - expanded to end of day)`);
    } else {
      console.log(`  📅 Date range: ${contextRequest.dateRange.start} to ${contextRequest.dateRange.end}`);
    }

    dateRange = {
      start: startDate,
      end: endDate
    };
  }

  // Post pending message
  await postPendingToolMessage({
    tenantId,
    chatId,
    calendarId,
    toolType: 'calendar',
    action: 'read',
    message: `Reading calendar...`
  });

  console.log(`  📥 Fetching calendar context...`);

  try {
    // Fetch context using shared service
    const context = await fetchCalendarContext(tenantId, calendarId, {
      dateRange,
      includeTasks: contextRequest.includeTasks !== false,  // Default true
      includeEvents: contextRequest.includeEvents !== false,  // Default true
      taskFilters: contextRequest.taskFilters
    });

    console.log(`  ✓ Context fetched: ${context.summary.totalTasks} tasks, ${context.summary.totalEvents} events`);

    // Post success message
    await postSuccessToolMessage({
      tenantId,
      chatId,
      calendarId,
      toolType: 'calendar',
      action: 'read',
      message: `Found ${context.summary.totalTasks} task${context.summary.totalTasks !== 1 ? 's' : ''} and ${context.summary.totalEvents} event${context.summary.totalEvents !== 1 ? 's' : ''}!`,
      count: context.summary.totalTasks + context.summary.totalEvents
    });

    // Format for LLM consumption
    const formattedContext = formatCalendarContextForLLM(context);

    return formattedContext;

  } catch (error: any) {
    console.error(`  ❌ Error fetching calendar context:`, error.message);
    // Return empty context rather than failing - brain can still work without it
    return '';
  }
}
