/**
 * Pulseline Inbound Agent SMS Node Configuration
 * Processes inbound SMS messages through an AI agent
 */

import { INodeTypeDescription } from '../../types';

export const pulselineInboundAgentSmsNode: INodeTypeDescription = {
  displayName: 'Inbound Agent SMS',
  name: 'pulselineInboundAgentSms',
  icon: 'fa:robot',
  group: ['agent-communication'],
  version: 1,
  description: 'Process an inbound SMS message through an AI agent. Agent will analyze and respond to the message.',
  keywords: ['ai', 'bot', 'text', 'reply', 'response', 'receive', 'chatbot'],
  subtitle: '={{$parameter["agentId"]}}',

  defaults: {
    name: 'Inbound Agent SMS',
    color: '#6366F1',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'sms_inboundAgent',
    apiEndpoint: '/api/agent-communication/sms/inbound',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the message was processed successfully', required: true },
        { name: 'messageId', type: 'string', description: 'ID of the processed message' },
        { name: 'conversationId', type: 'string', description: 'Conversation ID' },
        { name: 'response', type: 'string', description: 'Agent response message' },
      ],
    },
    loadOptionsMethods: {
      getAgents: {
        endpoint: '/api/agent-management',
        method: 'GET',
        responseMapping: {
          valueField: 'id',
          labelField: 'name',
        },
      },
      getActions: {
        endpoint: '/api/agent-training/actions/agent/{{$parameter["agentId"]}}',
        method: 'GET',
        responseMapping: {
          valueField: 'actionId',
          labelField: 'name',
          dataPath: 'actions', // Actions are nested in data.actions
        },
        dependsOn: ['agentId'],
      },
      getPhoneNumbers: {
        endpoint: '/api/phone-numbers/purchased',
        method: 'GET',
        responseMapping: {
          valueField: 'phoneNumber',
          labelField: 'phoneNumber',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Agent',
      name: 'agentId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getAgents',
      },
      default: '',
      required: true,
      description: 'Select the AI agent to process this inbound message',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Message Content',
      name: 'messageContent',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '={{$json.body.Body}}',
      required: true,
      placeholder: '={{$json.body.Body}}',
      description: 'The inbound SMS message content from the webhook',
    },
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '={{$json.contactId}}',
      required: true,
      placeholder: '={{$json.contactId}}',
      description: 'Contact who sent the message (should be resolved from Find Contact node)',
    },
    {
      displayName: 'Action Type (Hidden)',
      name: 'action',
      type: 'hidden',
      default: 'inbound',
      description: 'Action type for routing (hardcoded to inbound)',
    },
    {
      displayName: 'Action',
      name: 'actionId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getActions',
      },
      default: '',
      description: 'Optional: Select an action for specialized agent behavior',
      displayOptions: {
        show: {
          agentId: ['*'],  // Show when any agent is selected
        },
      },
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'From Phone Number',
      name: 'from',
      type: 'string',
      default: '={{$json.body.From}}',
      placeholder: '={{$json.body.From}}',
      description: 'Sender phone number (the contact who sent the SMS)',
    },
    {
      displayName: 'To Phone Number',
      name: 'to',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getPhoneNumbers',
      },
      default: '',
      description: 'Select your phone number that received this SMS',
      options: [], // Will be populated dynamically
    },
  ],
};
