/**
 * Phone Call Completed Trigger Node Configuration
 * Internal subscription trigger for phone call completed events
 *
 * This node automatically creates a trigger subscription when added to a workflow.
 * When a phone call completes, the subscription system posts the event to the workflow's webhook URL.
 */

import { INodeTypeDescription, IResponseField } from '../../types';
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// Get event definition from registry
const eventDefinition = TriggerDestinationRegistry.getEventDefinition('phone.call.completed.v1');

if (!eventDefinition) {
  throw new Error('Phone Call Completed event definition not found in TriggerDestinationRegistry');
}

// Convert payload schema to success response fields
const successResponseFields: IResponseField[] = Object.entries(eventDefinition.payloadSchema.properties).map(([name, schema]: [string, any]) => {
  const field: IResponseField = {
    name,
    type: schema.type,
    description: schema.description,
    required: eventDefinition.payloadSchema.required?.includes(name) || false,
  };
  return field;
});

export const phoneCallCompletedTriggerNode: INodeTypeDescription = {
  displayName: 'Phone Call Completed',
  name: 'phoneCallCompletedTrigger',
  icon: 'fa:phone-slash',
  group: ['trigger', 'communication'],
  version: 1,
  description: 'Triggers when an agent phone call completes with transcript available',
  keywords: ['voice', 'call', 'ended', 'finished', 'transcript', 'recording', 'ai', 'agent'],
  subtitle: 'Internal subscription trigger',

  defaults: {
    name: 'Phone Call Completed',
    color: '#3b82f6', // Blue for phone calls
  },

  inputs: [],  // Triggers have no inputs
  outputs: ['main'],

  // Pulseline custom metadata
  _pulseline: {
    isCustomNode: true,
    isTrigger: true,
    transformationMethod: 'trigger_webhook', // Declarative transformation to n8n webhook
    triggerType: 'phone.call.completed.v1',

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

  // No user-configurable parameters - subscription is auto-created on node add
  properties: [],
};
