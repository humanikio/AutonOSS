/**
 * Create Event Handler Adapter
 * Normalizes LLM output and calls createEvent service
 */

import { createEvent, CreateEventInput, EventType } from '../../../../services/eventManager';
import { postPendingToolMessage, postSuccessToolMessage, postErrorToolMessage } from '../../shared/postToolMessage';
import type { ToolExecutionContext } from './types';

export interface CreateEventHandlerParams {
  eventName: string;
  eventType: EventType;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
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

export interface CreateEventHandlerResult {
  success: boolean;
  eventId?: string;
  eventName?: string;
  message: string;
  error?: string;
}

/**
 * Create Event Handler
 * Adapter that normalizes LLM output and calls createEvent service
 */
export async function createEventHandler(
  params: CreateEventHandlerParams,
  context: ToolExecutionContext
): Promise<CreateEventHandlerResult> {
  try {
    console.log(`\n=📅 CREATE EVENT HANDLER`);
    console.log(`   Event Name: ${params.eventName}`);
    console.log(`   Event Type: ${params.eventType}`);
    console.log(`   Start Time: ${params.startTime}`);

    // Validate required fields
    if (!params.eventName) {
      throw new Error('eventName is required');
    }

    if (!params.eventType) {
      throw new Error('eventType is required');
    }

    if (!params.startTime) {
      throw new Error('startTime is required');
    }

    if (!params.endTime) {
      throw new Error('endTime is required');
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
      action: 'create',
      message: `Creating event "${params.eventName}"...`
    });

    // Normalize dates (convert ISO strings to Date objects)
    const input: CreateEventInput = {
      eventName: params.eventName,
      eventType: params.eventType,
      startTime: new Date(params.startTime),
      endTime: new Date(params.endTime),
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
    const event = await createEvent(
      context.tenantId,
      context.calendarId,
      input
    );

    console.log(`✓ Event created: ${event.eventId}`);

    // Post success message
    await postSuccessToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'create',
      message: `Created event "${event.eventName}"!`,
      entityId: event.eventId,
      entityType: 'event'
    });

    return {
      success: true,
      eventId: event.eventId,
      eventName: event.eventName,
      message: `Event "${event.eventName}" created successfully`
    };

  } catch (error: any) {
    console.error(`❌ Create event handler error:`, error.message);

    // Post error message
    await postErrorToolMessage({
      tenantId: context.tenantId,
      chatId: context.chatId,
      calendarId: context.calendarId,
      toolType: 'event',
      action: 'create',
      message: `Failed to create event "${params.eventName}"`,
      error: error.message
    });

    return {
      success: false,
      message: 'Failed to create event',
      error: error.message
    };
  }
}
