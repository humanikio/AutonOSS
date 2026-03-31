/**
 * Update Event Handler Adapter
 * Normalizes LLM output and calls updateEvent service
 */

import { updateEvent, UpdateEventInput, EventType } from '../../../../services/eventManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from './types';

export interface UpdateEventHandlerParams {
  eventId: string;
  eventName?: string;
  eventType?: EventType;
  startTime?: string; // ISO 8601
  endTime?: string; // ISO 8601
  description?: string;
  location?: string;
  attendees?: Array<{
    name?: string;
    email?: string;
    phoneNumber?: string;
    contactId?: string;
  }>;
  color?: string;
  isAllDay?: boolean;
  timezone?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string; // ISO 8601
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

export interface UpdateEventHandlerResult {
  success: boolean;
  eventId?: string;
  message: string;
  error?: string;
}

/**
 * Update Event Handler
 * Adapter that normalizes LLM output and calls updateEvent service
 */
export async function updateEventHandler(
  params: UpdateEventHandlerParams,
  context: ToolExecutionContext
): Promise<UpdateEventHandlerResult> {
  try {
    console.log(`\n=✏️ UPDATE EVENT HANDLER`);
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
      action: 'update',
      message: `Updating event...`,
      entityId: params.eventId
    });

    // Normalize dates (convert ISO strings to Date objects)
    const input: UpdateEventInput = {
      eventName: params.eventName,
      eventType: params.eventType,
      startTime: params.startTime ? new Date(params.startTime) : undefined,
      endTime: params.endTime ? new Date(params.endTime) : undefined,
      description: params.description,
      location: params.location,
      attendees: params.attendees,
      color: params.color,
      isAllDay: params.isAllDay,
      timezone: params.timezone,
      recurrence: params.recurrence ? {
        frequency: params.recurrence.frequency,
        interval: params.recurrence.interval,
        endDate: params.recurrence.endDate ? new Date(params.recurrence.endDate) : undefined
      } : undefined,
      reminders: params.reminders,
      metadata: params.metadata
    };

    // Call actual service
    const event = await updateEvent(
      context.tenantId,
      context.calendarId,
      params.eventId,
      input
    );

    if (!event) {
      throw new Error(`Event not found: ${params.eventId}`);
    }

    console.log(`✓ Event updated: ${event.eventId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'update',
      message: `Updated event "${event.eventName}"!`,
      entityId: event.eventId,
      entityType: 'event'
    });

    return {
      success: true,
      eventId: event.eventId,
      message: `Event "${event.eventName}" updated successfully`
    };

  } catch (error: any) {
    console.error(`❌ Update event handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'update',
      message: `Failed to update event`,
      entityId: params.eventId,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to update event',
      error: error.message
    };
  }
}
