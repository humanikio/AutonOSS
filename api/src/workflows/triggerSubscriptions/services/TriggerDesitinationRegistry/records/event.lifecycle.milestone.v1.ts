/**
 * Event Lifecycle Milestone Event Definition
 * Triggered at various milestones throughout an event's lifecycle
 *
 * Trigger Point: n8n state-holder workflow posts to /api/calendars/event-lifecycle/milestone
 * Available for both pre-event milestones and post-event completion
 */

import { TriggerEventDefinition } from '../../../types';

export const eventLifecycleMilestoneV1: TriggerEventDefinition = {
  type: 'event.lifecycle.milestone.v1',
  version: 1,
  displayName: 'Event Lifecycle Milestone',
  description: 'Triggered at various milestones throughout an event\'s lifecycle (5 days before, 1 hour before, completion, etc.)',
  category: 'calendar',

  payloadSchema: {
    type: 'object',
    properties: {
      // Core identifiers
      tenantId: { type: 'string', description: 'Tenant identifier' },
      eventId: { type: 'string', description: 'Event identifier' },
      calendarId: { type: 'string', description: 'Calendar identifier' },

      // Milestone information
      milestone: {
        type: 'string',
        description: 'Milestone type',
        enum: [
          'event_created',
          '5_days_before',
          '4_days_before',
          '3_days_before',
          '2_days_before',
          '1_day_before',
          '6_hours_before',
          '2_hours_before',
          '1_hour_before',
          '30_minutes_before',
          '10_minutes_before',
          '1_minute_before',
          'event_completed'
        ]
      },

      // Contact ID (flat, for adapter compatibility)
      contactId: {
        type: 'string',
        description: 'Contact ID of primary attendee (alias for adapter nodes)',
        nullable: true
      },

      // Primary attendee information (GHL-style model)
      primaryContactId: {
        type: 'string',
        description: 'Contact ID of primary attendee (for {{contact.*}} merge fields)',
        nullable: true
      },
      primaryAttendeeId: {
        type: 'string',
        description: 'Attendee ID of primary attendee',
        nullable: true
      },

      // Attendee information
      attendeeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of all attendee IDs (primary + guests)'
      },
      guestAttendeeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of guest attendee IDs (excluding primary)'
      },

      // Full event data
      eventData: {
        type: 'object',
        description: 'Complete event object with all details',
        properties: {
          eventId: { type: 'string' },
          calendarId: { type: 'string' },
          tenantId: { type: 'string' },
          eventName: { type: 'string' },
          eventType: { type: 'string' },
          description: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          location: { type: 'string' },
          color: { type: 'string' },
          isAllDay: { type: 'boolean' },
          attendees: { type: 'array', items: { type: 'string' } },
          primaryContactId: { type: 'string', nullable: true },
          primaryAttendeeId: { type: 'string', nullable: true },
          metadata: { type: 'object' }
        }
      },

      // Metadata
      timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp when milestone was triggered' },
      stateHolderTimestamp: { type: 'string', format: 'date-time', description: 'Appointment time according to n8n state holder' },
      isValid: { type: 'boolean', description: 'Whether milestone was validated against database' }
    },
    required: ['tenantId', 'eventId', 'calendarId', 'milestone', 'eventData', 'timestamp', 'isValid']
  },

  examplePayload: {
    tenantId: 'ten_123abc',
    eventId: 'evt_456def',
    calendarId: 'cal_789ghi',
    milestone: '1_hour_before',
    attendeeIds: ['att_111', 'att_222'],
    eventData: {
      eventId: 'evt_456def',
      calendarId: 'cal_789ghi',
      tenantId: 'ten_123abc',
      eventName: 'Client Meeting with John Doe',
      eventType: 'meeting',
      description: 'Quarterly review meeting',
      startTime: '2025-11-15T14:00:00Z',
      endTime: '2025-11-15T15:00:00Z',
      location: '123 Main St, Conference Room A',
      color: '#3B82F6',
      isAllDay: false,
      attendees: ['att_111', 'att_222'],
      metadata: {}
    },
    timestamp: '2025-11-15T13:00:00Z',
    stateHolderTimestamp: '2025-11-15T14:00:00Z',
    isValid: true
  },

  filterableFields: [
    { field: 'milestone', type: 'string', description: 'Filter by specific milestone (e.g., "1_hour_before")' },
    { field: 'eventData.eventType', type: 'string', description: 'Filter by event type (meeting, call, appointment, etc.)' },
    { field: 'eventData.location', type: 'string', description: 'Filter by event location' },
    { field: 'isValid', type: 'boolean', description: 'Filter by validation status' }
  ],

  isStable: true
};
