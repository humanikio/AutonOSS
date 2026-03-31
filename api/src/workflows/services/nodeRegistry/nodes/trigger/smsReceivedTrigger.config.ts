/**
 * SMS Received Trigger Node Configuration
 * Internal subscription trigger for SMS received events
 *
 * This node automatically creates a trigger subscription when added to a workflow.
 * When an SMS is received, the subscription system posts the event to the workflow's webhook URL.
 */

import { INodeTypeDescription, IResponseField } from '../../types';
import { TriggerDestinationRegistry } from '../../../../triggerSubscriptions/services/TriggerDesitinationRegistry/index';

// Get event definition from registry
const eventDefinition = TriggerDestinationRegistry.getEventDefinition('sms.received.v1');

if (!eventDefinition) {
  throw new Error('SMS Received event definition not found in TriggerDestinationRegistry');
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

export const smsReceivedTriggerNode: INodeTypeDescription = {
  displayName: 'SMS Received',
  name: 'smsReceivedTrigger',
  icon: 'fa:comment-dots',
  group: ['trigger', 'communication'],
  version: 1,
  description: 'Triggers when an SMS message is received and processed',
  keywords: ['text', 'message', 'inbound', 'incoming', 'reply', 'response', 'twilio'],
  subtitle: 'Internal subscription trigger',

  defaults: {
    name: 'SMS Received',
    color: '#10b981', // Green for SMS
  },

  inputs: [],  // Triggers have no inputs
  outputs: ['main'],

  // Pulseline custom metadata
  _pulseline: {
    isCustomNode: true,
    isTrigger: true,
    triggerType: 'sms.received.v1',
    transformationMethod: 'trigger_webhook', // Declarative transformation to n8n webhook

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
