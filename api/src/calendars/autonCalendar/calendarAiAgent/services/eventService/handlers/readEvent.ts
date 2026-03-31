/**
 * Read Event Handler Adapter
 * Normalizes LLM output and calls readEvent service
 */

import { readEvent, CalendarEvent } from '../../../../services/eventManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from './types';

export interface ReadEventHandlerParams {
  eventId: string;
}

export interface ReadEventHandlerResult {
  success: boolean;
  event?: CalendarEvent;
  message: string;
  error?: string;
}

/**
 * Read Event Handler
 * Adapter that normalizes LLM output and calls readEvent service
 */
export async function readEventHandler(
  params: ReadEventHandlerParams,
  context: ToolExecutionContext
): Promise<ReadEventHandlerResult> {
  try {
    console.log(`\n=📖 READ EVENT HANDLER`);
    console.log(`   Event ID: ${params.eventId}`);

    // Validate required fields
    if (!params.eventId) {
      throw new Error('eventId is required');
    }

    if (!context.calendarId) {
      throw new Error('calendarId is required from context');
    }

    // Post pending message
    await postPendingToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'read',
      message: `Reading event...`,
      entityId: params.eventId
    });

    // Call actual service
    const event = await readEvent(
      context.tenantId,
      context.calendarId,
      params.eventId
    );

    if (!event) {
      throw new Error(`Event not found: ${params.eventId}`);
    }

    console.log(`✓ Event retrieved: ${event.eventName}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'read',
      message: `Found event "${event.eventName}"!`,
      entityId: event.eventId,
      entityType: 'event'
    });

    return {
      success: true,
      event,
      message: `Event "${event.eventName}" retrieved successfully`
    };

  } catch (error: any) {
    console.error(`❌ Read event handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'read',
      message: `Failed to read event`,
      entityId: params.eventId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to read event',
      error: error.message
    };
  }
}
