/**
 * Get Events Handler Adapter
 * Normalizes LLM output and calls getEvents service
 */

import { getEvents, CalendarEvent } from '../../../../services/eventManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from './types';

export interface GetEventsHandlerParams {
  // No parameters needed - gets all events for calendar
}

export interface GetEventsHandlerResult {
  success: boolean;
  events?: CalendarEvent[];
  count?: number;
  message: string;
  error?: string;
}

/**
 * Get Events Handler
 * Adapter that calls getEvents service to retrieve all events
 */
export async function getEventsHandler(
  params: GetEventsHandlerParams,
  context: ToolExecutionContext
): Promise<GetEventsHandlerResult> {
  try {
    console.log(`\n=📋 GET EVENTS HANDLER`);

    if (!context.calendarId) {
      throw new Error('calendarId is required from context');
    }

    // Post pending message
    await postPendingToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'search',
      message: `Searching for events...`
    });

    // Call actual service
    const events = await getEvents(
      context.tenantId,
      context.calendarId
    );

    console.log(`✓ Retrieved ${events.length} event(s)`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'search',
      message: `Found ${events.length} event${events.length !== 1 ? 's' : ''}!`,
      count: events.length
    });

    return {
      success: true,
      events,
      count: events.length,
      message: `Retrieved ${events.length} event(s)`
    };

  } catch (error: any) {
    console.error(`❌ Get events handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'search',
      message: `Failed to search for events`,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to get events',
      error: error.message
    };
  }
}
