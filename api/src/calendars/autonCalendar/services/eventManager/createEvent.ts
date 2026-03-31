import { firestore } from '../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { attendeeOrchestrator } from '../../utils/attendeeOrchestrator';
import { AddAttendeeInput } from '../atendeesManager';

export type EventType = 'meeting' | 'call' | 'video' | 'task' | 'reminder' | 'appointment';

export interface CalendarEvent {
  eventId: string;
  calendarId: string;
  tenantId: string;
  eventName: string;
  eventType: EventType;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[]; // Array of attendee IDs (references to attendee subcollection)
  primaryAttendeeId?: string | null; // First attendee added (primary contact for triggers)
  primaryContactId?: string | null; // Contact ID from primary attendee (for merge fields)
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  eventName: string;
  eventType: EventType;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: AddAttendeeInput[]; // Full attendee objects for creation
  color?: string;
  isAllDay?: boolean;
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    minutes: number;
    method: 'email' | 'notification' | 'sms';
  }[];
  metadata?: Record<string, any>;
}

/**
 * Create a new event for a calendar
 * @param tenantId - The tenant ID
 * @param calendarId - The calendar ID
 * @param input - Event creation data
 * @returns The created event
 */
export async function createEvent(
  tenantId: string,
  calendarId: string,
  input: CreateEventInput
): Promise<CalendarEvent> {
  try {
    const eventId = uuidv4();
    const now = new Date();

    console.log(`📅 Creating event: ${input.eventName} (${eventId})`);

    // 1. Create event document WITHOUT attendees initially
    const event: CalendarEvent = {
      eventId,
      calendarId,
      tenantId,
      eventName: input.eventName,
      eventType: input.eventType,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      attendees: [], // Empty initially - will be populated after creating attendee records
      color: input.color || '#3B82F6', // Default blue
      isAllDay: input.isAllDay || false,
      timezone: input.timezone || 'America/New_York', // Default to EST if not provided
      recurrence: input.recurrence,
      reminders: input.reminders || [],
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    const eventRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('activeCalendars')
      .doc(calendarId)
      .collection('events')
      .doc(eventId);

    await eventRef.set(event);

    console.log(`✅ Event document created: ${eventId}`);

    // 2. If attendees provided, create attendee records and link them
    if (input.attendees && input.attendees.length > 0) {
      console.log(`👥 Creating ${input.attendees.length} attendees for event ${eventId}`);

      // Validate attendees before creating
      attendeeOrchestrator.validateAttendees(input.attendees);

      // Create attendees and get their IDs
      const attendeeIds = await attendeeOrchestrator.createEventAttendees(
        tenantId,
        calendarId,
        eventId,
        input.attendees
      );

      // 3. Determine primary attendee (first one added)
      let primaryAttendeeId: string | null = null;
      let primaryContactId: string | null = null;

      if (attendeeIds.length > 0) {
        primaryAttendeeId = attendeeIds[0]; // First attendee is primary

        // Fetch the primary attendee to get contactId
        const { getAttendee } = await import('../atendeesManager/getAttendees');
        const primaryAttendee = await getAttendee(tenantId, calendarId, eventId, primaryAttendeeId);

        if (primaryAttendee && primaryAttendee.contactId) {
          primaryContactId = primaryAttendee.contactId;
          console.log(`   Primary attendee contactId: ${primaryContactId}`);
        } else {
          console.log(`   Primary attendee has no contactId (email/phone only)`);
        }
      }

      // 4. Update event document with attendee IDs AND primary fields
      await eventRef.update({
        attendees: attendeeIds,
        primaryAttendeeId,
        primaryContactId,
        updatedAt: new Date()
      });

      // Update local event object
      event.attendees = attendeeIds;
      event.primaryAttendeeId = primaryAttendeeId;
      event.primaryContactId = primaryContactId;

      console.log(`✅ Event created with ${attendeeIds.length} attendees (primary: ${primaryAttendeeId})`);
    } else {
      console.log(`✅ Event created without attendees`);
    }

    // 4. Trigger 'event_created' milestone (immediate notification)
    console.log(`\n🎉 Triggering 'event_created' milestone...`);

    // Dynamic import to avoid circular dependencies
    const { notifySubscriptionService } = await import('../eventLifecycleManager/notifySubscriptionService');

    try {
      await notifySubscriptionService({
        tenantId,
        eventId,
        calendarId,
        milestone: 'event_created',
        event,
        attendeeIds: event.attendees || [],
        primaryContactId: event.primaryContactId || null,
        primaryAttendeeId: event.primaryAttendeeId || null,
        stateHolderTimestamp: input.startTime,
        isValid: true
      });
      console.log(`✅ Event creation notifications sent`);
    } catch (error) {
      console.log(`⚠️  Event creation notification failed:`, error);
      // Don't fail event creation if notification fails - log and continue
    }

    // 5. Initialize future milestone system for the event
    console.log(`\n📅 Initializing future milestones for event...`);

    const { initializeEventMilestones } = await import('../eventLifecycleManager');

    const milestoneResult = await initializeEventMilestones({
      eventId,
      calendarId,
      tenantId,
      startTime: input.startTime,
      endTime: input.endTime,
      timezone: input.timezone
    });

    if (milestoneResult.success) {
      console.log(`✅ Milestones initialized: ${milestoneResult.message}`);
    } else {
      console.log(`⚠️  Milestone initialization failed: ${milestoneResult.message}`);
      // Don't fail event creation if milestones fail - log and continue
    }

    return event;
  } catch (error) {
    console.error('❌ Error creating event:', error);
    throw new Error('Failed to create event');
  }
}
