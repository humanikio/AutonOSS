/**
 * Delete Event Handler Adapter
 * Normalizes LLM output and calls deleteEvent service
 */

import { deleteEvent } from '../../../../services/eventManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from './types';

export interface DeleteEventHandlerParams {
  eventId: string;
}

export interface DeleteEventHandlerResult {
  success: boolean;
  eventId?: string;
  message: string;
  error?: string;
}

/**
 * Delete Event Handler
 * Adapter that normalizes LLM output and calls deleteEvent service
 */
export async function deleteEventHandler(
  params: DeleteEventHandlerParams,
  context: ToolExecutionContext
): Promise<DeleteEventHandlerResult> {
  try {
    console.log(`\n=🗑️ DELETE EVENT HANDLER`);
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
      action: 'delete',
      message: `Deleting event...`,
      entityId: params.eventId
    });

    // Call actual service
    const deleted = await deleteEvent(
      context.tenantId,
      context.calendarId,
      params.eventId
    );

    if (!deleted) {
      throw new Error(`Event not found: ${params.eventId}`);
    }

    console.log(`✓ Event deleted: ${params.eventId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'delete',
      message: `Deleted event!`,
      entityId: params.eventId,
      entityType: 'event'
    });

    return {
      success: true,
      eventId: params.eventId,
      message: `Event deleted successfully`
    };

  } catch (error: any) {
    console.error(`❌ Delete event handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'delete',
      message: `Failed to delete event`,
      entityId: params.eventId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to delete event',
      error: error.message
    };
  }
}
