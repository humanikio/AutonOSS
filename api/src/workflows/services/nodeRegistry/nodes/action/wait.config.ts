/**
 * Wait Action Node Configuration
 * Based on n8n's Wait node: packages/nodes-base/nodes/Wait/
 */

import { INodeTypeDescription } from '../../types';

export const waitNode: INodeTypeDescription = {
  displayName: 'Wait',
  name: 'wait',
  icon: 'fa:pause-circle',
  group: ['helpers'],
  version: [1, 1.1],
  defaultVersion: 1.1,
  description: 'Pauses workflow execution',
  keywords: ['delay', 'pause', 'timer', 'sleep', 'hold', 'timeout', 'schedule'],
  subtitle: '={{$parameter["resume"]}}',

  defaults: {
    name: 'Wait',
    color: '#804000',
  },

  inputs: ['main'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Resume',
      name: 'resume',
      type: 'options',
      options: [
        {
          name: 'After Time Interval',
          value: 'timeInterval',
          description: 'Wait for a certain amount of time',
        },
        {
          name: 'At Specified Time',
          value: 'specificTime',
          description: 'Wait until a specific date and time',
        },
        {
          name: 'On Webhook Call',
          value: 'webhook',
          description: 'Wait for a webhook call to continue',
        },
        {
          name: 'On Form Submission',
          value: 'form',
          description: 'Wait for a form to be submitted',
        },
        {
          name: 'Appointment Milestone',
          value: 'appointmentMilestone',
          description: 'Wait until an event reaches a specific milestone',
        },
      ],
      default: 'timeInterval',
      description: 'Determines when the workflow should continue',
    },
    {
      displayName: 'Wait Amount',
      name: 'amount',
      type: 'number',
      displayOptions: {
        show: {
          resume: ['timeInterval'],
        },
      },
      typeOptions: {
        minValue: 0,
        numberStepSize: 1,
      },
      default: 1,
      description: 'The time to wait',
    },
    {
      displayName: 'Wait Unit',
      name: 'unit',
      type: 'options',
      displayOptions: {
        show: {
          resume: ['timeInterval'],
        },
      },
      options: [
        {
          name: 'Seconds',
          value: 'seconds',
        },
        {
          name: 'Minutes',
          value: 'minutes',
        },
        {
          name: 'Hours',
          value: 'hours',
        },
        {
          name: 'Days',
          value: 'days',
        },
      ],
      default: 'hours',
      description: 'The time unit of the Wait Amount value',
    },
    {
      displayName: 'Resume At',
      name: 'resumeAt',
      type: 'dateTime',
      displayOptions: {
        show: {
          resume: ['specificTime'],
        },
      },
      default: '',
      description: 'The date and time when the workflow should continue',
    },
    {
      displayName: 'Webhook Path',
      name: 'path',
      type: 'string',
      displayOptions: {
        show: {
          resume: ['webhook'],
        },
      },
      default: '',
      placeholder: 'my-wait-webhook',
      required: true,
      description: 'The path for the webhook URL that will resume the workflow',
    },
    {
      displayName: 'HTTP Method',
      name: 'httpMethod',
      type: 'options',
      displayOptions: {
        show: {
          resume: ['webhook'],
        },
      },
      options: [
        {
          name: 'GET',
          value: 'GET',
        },
        {
          name: 'POST',
          value: 'POST',
        },
        {
          name: 'PUT',
          value: 'PUT',
        },
        {
          name: 'DELETE',
          value: 'DELETE',
        },
      ],
      default: 'POST',
      description: 'The HTTP method to listen to',
    },
    {
      displayName: 'Milestone',
      name: 'milestone',
      type: 'options',
      displayOptions: {
        show: {
          resume: ['appointmentMilestone'],
        },
      },
      options: [
        {
          name: '5 Days Before',
          value: '5_days_before',
        },
        {
          name: '4 Days Before',
          value: '4_days_before',
        },
        {
          name: '3 Days Before',
          value: '3_days_before',
        },
        {
          name: '2 Days Before',
          value: '2_days_before',
        },
        {
          name: '1 Day Before',
          value: '1_day_before',
        },
        {
          name: '1 Hour Before',
          value: '1_hour_before',
        },
        {
          name: '30 Minutes Before',
          value: '30_minutes_before',
        },
        {
          name: '10 Minutes Before',
          value: '10_minutes_before',
        },
        {
          name: 'Event Start',
          value: 'event_start',
        },
        {
          name: 'Event Completed',
          value: 'event_completed',
        },
      ],
      default: '1_hour_before',
      required: true,
      description: 'The milestone to wait for',
    },
    {
      displayName: 'Event ID Field',
      name: 'eventIdField',
      type: 'string',
      displayOptions: {
        show: {
          resume: ['appointmentMilestone'],
          _never: [true], // Hide from UI - auto-resolved during compilation
        },
      },
      default: '={{$event.eventId}}', // Placeholder, will be resolved to trigger reference
      required: false, // Not user-editable
      description: 'Internal: Auto-resolved to reference trigger node eventId',
      placeholder: '={{$event.eventId}}',
    },
  ],

  _pulseline: {
    isCustomNode: true,
    webhookWait: true,
    createSubscriptionOnSave: true,
    subscriptionType: 'event.lifecycle.milestone.wait.v1',
    apiEndpoint: '',  // Not used for wait nodes
    httpMethod: 'POST',
    requiresAuth: false,

    // Subflow trigger configuration (appointmentMilestone mode only)
    // When N > 1 milestone waits exist in a linear path, trigger subflow creation with switch routing
    subflowTrigger: {
      type: 'milestoneWait',              // Identifier for this subflow trigger class
      triggerWhen: 'appointmentMilestone', // Only active when resume parameter = 'appointmentMilestone'
      minCount: 2,                         // Minimum count (N+1 where N=1) to trigger subflow creation
      determinationFunction: 'computeNextValidMilestone', // Function name for switch expression
      sortKey: 'milestone',                // Parameter to use for ordering (earliest to latest)
    },

    // Dynamic transformation method based on resume parameter
    transformationMethodSelector: 'resume', // Parameter name that determines which method to use
    transformationMethodMap: {
      timeInterval: 'wait_timeInterval',
      specificTime: 'wait_specificTime',
      webhook: 'wait_webhook',
      form: 'wait_form',
      appointmentMilestone: 'wait_appointmentMilestone',
    },
  },

  webhooks: [
    {
      name: 'default',
      httpMethod: '={{$parameter["httpMethod"]}}',
      path: '={{$parameter["path"]}}',
      responseMode: 'onReceived',
      responseData: 'noData',
    },
  ],

  hints: [
    {
      message: 'Wait node will pause workflow execution. Make sure this is intentional.',
      type: 'warning',
      location: 'ndv',
    },
  ],
};
