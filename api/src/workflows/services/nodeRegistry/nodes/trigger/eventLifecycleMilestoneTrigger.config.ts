/**
 * Event Lifecycle Milestone Trigger Node Configuration
 * Internal subscription trigger for event lifecycle milestones
 *
 * This node automatically creates a trigger subscription when added to a workflow.
 * When an event milestone occurs (reminder, completion), the subscription system
 * posts the event data to the workflow's webhook URL.
 */

import { INodeTypeDescription, IResponseField } from '../../types';
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// Get event definition from registry
const eventDefinition = TriggerDestinationRegistry.getEventDefinition('event.lifecycle.milestone.v1');

if (!eventDefinition) {
  throw new Error('Event Lifecycle Milestone event definition not found in TriggerDestinationRegistry');
}

// Convert payload schema to success response fields
// Note: Flattening eventData object properties for easier field mapping
const successResponseFields: IResponseField[] = [
  // Core identifiers
  {
    name: 'tenantId',
    type: 'string',
    description: 'Tenant identifier',
    required: true
  },
  {
    name: 'eventId',
    type: 'string',
    description: 'Event identifier',
    required: true
  },
  {
    name: 'calendarId',
    type: 'string',
    description: 'Calendar identifier',
    required: true
  },
  // Milestone information
  {
    name: 'milestone',
    type: 'string',
    description: 'Milestone type (e.g., "1_hour_before", "event_completed")',
    required: true
  },
  // Contact ID (flat, for adapter compatibility)
  {
    name: 'contactId',
    type: 'string',
    description: 'Contact ID of primary attendee (alias for adapter nodes)',
    required: false
  },
  // Primary attendee information (GHL-style model)
  {
    name: 'primaryContactId',
    type: 'string',
    description: 'Contact ID of primary attendee (for {{contact.*}} merge fields)',
    required: false
  },
  {
    name: 'primaryAttendeeId',
    type: 'string',
    description: 'Attendee ID of primary attendee',
    required: false
  },
  // Attendee information
  {
    name: 'attendeeIds',
    type: 'array',
    description: 'Array of all attendee IDs (primary + guests)',
    required: false
  },
  {
    name: 'guestAttendeeIds',
    type: 'array',
    description: 'Array of guest attendee IDs (excluding primary)',
    required: false
  },
  // Event data - flattened for easier access
  {
    name: 'eventData.eventId',
    type: 'string',
    description: 'Event ID from event data',
    required: true
  },
  {
    name: 'eventData.eventName',
    type: 'string',
    description: 'Name of the event',
    required: true
  },
  {
    name: 'eventData.eventType',
    type: 'string',
    description: 'Type of event (meeting, call, appointment, etc.)',
    required: true
  },
  {
    name: 'eventData.description',
    type: 'string',
    description: 'Event description',
    required: false
  },
  {
    name: 'eventData.startTime',
    type: 'string',
    description: 'Event start time (ISO 8601 format)',
    required: true
  },
  {
    name: 'eventData.endTime',
    type: 'string',
    description: 'Event end time (ISO 8601 format)',
    required: true
  },
  {
    name: 'eventData.location',
    type: 'string',
    description: 'Event location',
    required: false
  },
  {
    name: 'eventData.color',
    type: 'string',
    description: 'Event color (hex code)',
    required: false
  },
  {
    name: 'eventData.isAllDay',
    type: 'boolean',
    description: 'Whether event is all-day',
    required: false
  },
  {
    name: 'eventData.attendees',
    type: 'array',
    description: 'Array of attendee IDs',
    required: false
  },
  {
    name: 'eventData.primaryContactId',
    type: 'string',
    description: 'Primary contact ID from event data',
    required: false
  },
  {
    name: 'eventData.primaryAttendeeId',
    type: 'string',
    description: 'Primary attendee ID from event data',
    required: false
  },
  {
    name: 'eventData.metadata',
    type: 'object',
    description: 'Additional event metadata',
    required: false
  },
  // Metadata
  {
    name: 'timestamp',
    type: 'string',
    description: 'ISO 8601 timestamp when milestone was triggered',
    required: true
  },
  {
    name: 'stateHolderTimestamp',
    type: 'string',
    description: 'Appointment time according to n8n state holder',
    required: false
  },
  {
    name: 'isValid',
    type: 'boolean',
    description: 'Whether milestone was validated against database',
    required: true
  }
];

export const eventLifecycleMilestoneTriggerNode: INodeTypeDescription = {
  displayName: 'Event Lifecycle Milestone',
  name: 'eventLifecycleMilestoneTrigger',
  icon: 'fa:calendar-check',
  group: ['trigger', 'calendar'],
  version: 1,
  description: 'Triggers at various milestones throughout an event\'s lifecycle (reminders, completion)',
  keywords: ['appointment', 'reminder', 'meeting', 'booking', 'before', 'after', 'scheduled', 'calendar'],
  subtitle: 'Internal subscription trigger',

  defaults: {
    name: 'Event Lifecycle Milestone',
    color: '#8b5cf6', // Purple for calendar/events
  },

  inputs: [],  // Triggers have no inputs
  outputs: ['main'],

  // Pulseline custom metadata
  _pulseline: {
    isCustomNode: true,
    isTrigger: true,
    transformationMethod: 'trigger_webhook', // Declarative transformation to n8n webhook
    triggerType: 'event.lifecycle.milestone.v1',

    // Not used for trigger nodes (they receive data, don't make requests)
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,

    // Success response defines the payload structure received from our system
    // Used by frontend for custom field mapping
    successResponse: {
      fields: successResponseFields,
    },
  },

  // User can configure which milestone to listen for
  properties: [
    {
      displayName: 'Milestone Filter',
      name: 'milestoneFilter',
      type: 'options',
      default: 'all',
      description: 'Which event lifecycle milestone to trigger on',
      options: [
        {
          name: 'All Milestones',
          value: 'all',
          description: 'Trigger on any milestone event'
        },
        {
          name: 'Event Created',
          value: 'event_created',
          description: 'Trigger when event is first created'
        },
        {
          name: '5 Days Before',
          value: '5_days_before',
          description: 'Trigger 5 days before the event'
        },
        {
          name: '4 Days Before',
          value: '4_days_before',
          description: 'Trigger 4 days before the event'
        },
        {
          name: '3 Days Before',
          value: '3_days_before',
          description: 'Trigger 3 days before the event'
        },
        {
          name: '2 Days Before',
          value: '2_days_before',
          description: 'Trigger 2 days before the event'
        },
        {
          name: '1 Day Before',
          value: '1_day_before',
          description: 'Trigger 1 day before the event'
        },
        {
          name: '6 Hours Before',
          value: '6_hours_before',
          description: 'Trigger 6 hours before the event'
        },
        {
          name: '2 Hours Before',
          value: '2_hours_before',
          description: 'Trigger 2 hours before the event'
        },
        {
          name: '1 Hour Before',
          value: '1_hour_before',
          description: 'Trigger 1 hour before the event'
        },
        {
          name: '30 Minutes Before',
          value: '30_minutes_before',
          description: 'Trigger 30 minutes before the event'
        },
        {
          name: '10 Minutes Before',
          value: '10_minutes_before',
          description: 'Trigger 10 minutes before the event'
        },
        {
          name: '1 Minute Before',
          value: '1_minute_before',
          description: 'Trigger 1 minute before the event'
        },
        {
          name: 'Event Completed',
          value: 'event_completed',
          description: 'Trigger when the event is marked as completed'
        }
      ]
    },
    {
      displayName: 'Event Type Filter',
      name: 'eventTypeFilter',
      type: 'options',
      default: 'all',
      description: 'Filter by specific event types',
      options: [
        {
          name: 'All Event Types',
          value: 'all',
          description: 'Trigger on all event types'
        },
        {
          name: 'Meeting',
          value: 'meeting'
        },
        {
          name: 'Call',
          value: 'call'
        },
        {
          name: 'Video',
          value: 'video'
        },
        {
          name: 'Task',
          value: 'task'
        },
        {
          name: 'Reminder',
          value: 'reminder'
        },
        {
          name: 'Appointment',
          value: 'appointment'
        }
      ]
    }
  ],
};
