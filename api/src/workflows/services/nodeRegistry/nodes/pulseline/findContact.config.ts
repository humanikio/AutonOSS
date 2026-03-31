/**
 * Pulseline Find Contact Node Configuration
 * Finds an existing contact by phone number or email (auto-detected)
 */

import { INodeTypeDescription } from '../../types';

export const pulselineFindContactNode: INodeTypeDescription = {
  displayName: 'Find Contact',
  name: 'pulselineFindContact',
  icon: 'fa:search',
  group: ['contactManagement'],
  version: 1,
  description: 'Finds a contact by phone number or email. Backend auto-detects whether the value is a phone or email.',
  keywords: ['search', 'lookup', 'get', 'locate', 'lead', 'person', 'customer', 'exists'],
  subtitle: '={{$parameter["value"]}}',

  defaults: {
    name: 'Find Contact',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main', 'main'], // Two outputs for conditional routing

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_find',
    apiEndpoint: '/api/contacts/find',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true, // Essential: allows workflow to continue even if API returns 500/404
    conditionalOutput: {
      enabled: true,
      field: 'found',
      trueLabel: 'Contact Found',
      falseLabel: 'Contact Not Found',
    },
    successResponse: {
      fields: [
        { name: 'found', type: 'boolean', description: 'Whether contact was found', required: true },
        { name: 'contactId', type: 'string', description: 'Unique contact identifier' },
        { name: 'name', type: 'string', description: 'Contact full name' },
        { name: 'phoneNumber', type: 'string', description: 'Contact phone number' },
        { name: 'email', type: 'string', description: 'Contact email address' },
        { name: 'customFields', type: 'object', description: 'Custom contact fields' },
      ],
    },
  },

  properties: [
    {
      displayName: 'Search Value',
      name: 'value',
      type: 'string',
      default: '',
      required: true,
      placeholder: '{{$contact.phoneNumber}}',
      description: '⚡ Provide EITHER a phone number OR email address. Backend auto-detects which one. Use phone number OR email - NOT BOTH.',
    },
    {
      displayName: 'If Not Found',
      name: 'ifNotFound',
      type: 'options',
      options: [
        {
          name: 'Continue (Return Empty)',
          value: 'continue',
        },
        {
          name: 'Stop Workflow (Error)',
          value: 'error',
        },
      ],
      default: 'continue',
      description: 'What to do if contact is not found',
    },
  ],
};
