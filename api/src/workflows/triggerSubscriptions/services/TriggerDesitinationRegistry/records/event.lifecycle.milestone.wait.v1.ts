/**
 * Trigger Definition: Event Lifecycle Milestone (Wait Node)
 *
 * For Wait nodes that pause workflow execution until an event reaches a specific milestone.
 *
 * KEY DIFFERENCES from event.lifecycle.milestone.v1:
 * - Uses resumeUrl instead of webhookUrl
 * - Subscription stores resumeUrl after workflow execution reaches wait node
 * - Execution calls resumeUrl to resume paused workflow (not trigger new workflow)
 * - Workflow is paused, waiting for milestone event
 */

import { TriggerEventDefinition } from '../../../types';

export const eventLifecycleMilestoneWaitV1: TriggerEventDefinition = {
  type: 'event.lifecycle.milestone.wait.v1',
  version: 1,
  displayName: 'Event Lifecycle Milestone (Wait)',
  description: 'Resumes a paused workflow when an event reaches a specific milestone',
  category: 'calendar',

  payloadSchema: {
    type: 'object',
    properties: {
      // Core identifiers
      tenantId: {
        type: 'string',
        description: 'Tenant ID'
      },
      eventId: {
        type: 'string',
        description: 'Event ID'
      },
      calendarId: {
        type: 'string',
        description: 'Calendar ID'
      },

      // Milestone information
      milestone: {
        type: 'string',
        enum: [
          '5_days_before',
          '4_days_before',
          '3_days_before',
          '2_days_before',
          '1_day_before',
          '1_hour_before',
          '30_minutes_before',
          '10_minutes_before',
          'event_start',
          'event_completed'
        ],
        description: 'The milestone that was reached'
      },

      // Attendee information
      attendeeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of attendee IDs associated with the event'
      },

      // Full event data
      eventData: {
        type: 'object',
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
          attendees: {
            type: 'array',
            items: { type: 'string' }
          },
          metadata: { type: 'object' }
        },
        required: ['eventId', 'eventName', 'eventType', 'startTime', 'endTime']
      },

      // Metadata
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'When the milestone was triggered (ISO 8601)'
      },
      stateHolderTimestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp from n8n state holder workflow (ISO 8601)'
      },
      isValid: {
        type: 'boolean',
        description: 'Whether the milestone timestamp was validated against database'
      }
    },
    required: [
      'tenantId',
      'eventId',
      'calendarId',
      'milestone',
      'eventData',
      'timestamp',
      'isValid'
    ]
  },

  // Example payload (for documentation and testing)
  examplePayload: {
    tenantId: 'ten_123',
    eventId: 'evt_456',
    calendarId: 'cal_789',
    milestone: '1_hour_before',
    attendeeIds: ['att_111', 'att_222'],
    eventData: {
      eventId: 'evt_456',
      calendarId: 'cal_789',
      tenantId: 'ten_123',
      eventName: 'Team Meeting',
      eventType: 'meeting',
      description: 'Weekly sync',
      startTime: '2025-11-15T14:00:00Z',
      endTime: '2025-11-15T15:00:00Z',
      location: 'Conference Room A',
      color: '#3b82f6',
      isAllDay: false,
      attendees: ['att_111', 'att_222'],
      metadata: {}
    },
    timestamp: '2025-11-15T13:00:00Z',
    stateHolderTimestamp: '2025-11-15T14:00:00Z',
    isValid: true
  },

  // Filterable fields for subscription conditions
  filterableFields: [
    { field: 'milestone', type: 'string', description: 'Filter by specific milestone' },
    { field: 'eventId', type: 'string', description: 'Filter by specific event ID' },
    { field: 'eventData.eventType', type: 'string', description: 'Filter by event type' },
    { field: 'isValid', type: 'boolean', description: 'Filter by validation status' }
  ],

  // Stability indicator
  isStable: true,

  // Metadata for subscription handling
  metadata: {
    usesResumeUrl: true,        // KEY FLAG - indicates to use resumeUrl not webhookUrl
    requiresEventId: true,       // Subscription must specify which event to wait for
    pausesWorkflow: true,        // Indicates workflow will be paused until triggered
    isWaitNode: true             // Special handling for wait node subscriptions
  }
};
