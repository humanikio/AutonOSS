/**
 * Pulseline Outbound Phone Call Node Configuration
 * Initiates an AI agent phone call to a contact
 */

import { INodeTypeDescription } from '../../types';

export const pulselineOutboundCallNode: INodeTypeDescription = {
  displayName: 'Outbound Call',
  name: 'pulselineOutboundCall',
  icon: 'fa:robot',
  group: ['agent-communication'],
  version: 1,
  description: 'Initiate an AI agent phone call to a contact. Automatically resolves contact from phone number or contactId.',
  keywords: ['ai', 'bot', 'voice', 'dial', 'phone', 'conversation', 'automated'],
  subtitle: '={{$parameter["agentId"]}}',

  defaults: {
    name: 'Outbound Call',
    color: '#8B5CF6',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    apiEndpoint: '/api/agent-communication/phone/start-call',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true,
    transformationMethod: 'phone_outboundCall',
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the call was initiated successfully', required: true },
        { name: 'data', type: 'object', description: 'Call initiation data including call SID and status' },
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
      description: 'Select the AI agent to use for this call',
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
      description: '💡 Provide either "Target Phone Number" OR "Contact ID" below. The agent will initiate a phone call with the contact.',
    },
    {
      displayName: 'Target Phone Number',
      name: 'targetPhoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      placeholder: '{{$contact.phoneNumber}}',
      description: 'Phone number to call. Leave empty if using Contact ID.',
    },
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$contact.contactId}}',
      placeholder: '{{$contact.contactId}}',
      description: 'Contact ID to call. Leave empty if using Target Phone Number.',
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
      displayName: 'Contact Creation Fields',
      name: 'contactCreation',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {},
      },
      description: '📝 Optional: Provide contact details below if creating a new contact during the call.',
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
    {
      displayName: 'Phone',
      name: 'phone',
      type: 'string',
      default: '',
      placeholder: '{{$contact.phoneNumber}}',
      description: 'Phone for contact creation (optional)',
    },
  ],
};
