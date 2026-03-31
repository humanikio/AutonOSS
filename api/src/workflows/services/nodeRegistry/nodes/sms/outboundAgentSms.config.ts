/**
 * Pulseline Outbound Agent SMS Node Configuration
 * Initiates an AI agent SMS conversation with a contact
 */

import { INodeTypeDescription } from '../../types';

export const pulselineOutboundAgentSmsNode: INodeTypeDescription = {
  displayName: 'Outbound Agent SMS',
  name: 'pulselineOutboundAgentSms',
  icon: 'fa:robot',
  group: ['agent-communication'],
  version: 1,
  description: 'Initiate an AI agent SMS conversation with a contact. Automatically resolves contact from phone number or contactId.',
  keywords: ['ai', 'bot', 'text', 'message', 'conversation', 'automated', 'chatbot'],
  subtitle: '={{$parameter["agentId"]}}',

  defaults: {
    name: 'Outbound Agent SMS',
    color: '#8B5CF6',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'sms_outboundAgent',
    apiEndpoint: '/api/agent-communication/sms/outbound',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the SMS was initiated successfully', required: true },
        { name: 'messageId', type: 'string', description: 'ID of the sent message' },
        { name: 'conversationId', type: 'string', description: 'Conversation ID' },
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
      description: 'Select the AI agent to use for this SMS conversation',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Target Method',
      name: 'targetMethod',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {},
      },
      description: '💡 Provide either "Target Phone Number" OR "Contact ID" below. The agent will initiate an SMS conversation with the contact.',
    },
    {
      displayName: 'Target Phone Number',
      name: 'targetPhoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      placeholder: '{{$contact.phoneNumber}}',
      description: 'Phone number to send SMS to. Leave empty if using Contact ID.',
    },
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$contact.contactId}}',
      placeholder: '{{$contact.contactId}}',
      description: 'Contact ID to send SMS to. Leave empty if using Target Phone Number.',
    },
    {
      displayName: 'Action Type (Hidden)',
      name: 'action',
      type: 'hidden',
      default: 'outbound',
      description: 'Action type for routing (hardcoded to outbound)',
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
      displayName: 'Message Content',
      name: 'messageContent',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '',
      placeholder: 'Optional custom message to start the conversation...',
      description: 'Optional: Provide a custom message to start the conversation',
    },
    {
      displayName: 'Contact Creation Fields',
      name: 'contactCreation',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {},
      },
      description: '📝 Optional: Provide contact details below if creating a new contact.',
    },
    {
      displayName: 'First Name',
      name: 'first_name',
      type: 'string',
      default: '',
      placeholder: '{{$contact.firstName}}',
      description: 'First name for contact creation (optional)',
    },
    {
      displayName: 'Last Name',
      name: 'last_name',
      type: 'string',
      default: '',
      placeholder: '{{$contact.lastName}}',
      description: 'Last name for contact creation (optional)',
    },
    {
      displayName: 'Full Name',
      name: 'full_name',
      type: 'string',
      default: '',
      placeholder: '{{$contact.name}}',
      description: 'Full name for contact creation (optional)',
    },
    {
      displayName: 'Email',
      name: 'email',
      type: 'string',
      default: '',
      placeholder: '{{$contact.email}}',
      description: 'Email for contact creation (optional)',
    },
  ],
};
