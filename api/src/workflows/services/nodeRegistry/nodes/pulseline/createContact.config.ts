/**
 * Auton Create Contact Node Configuration
 * Creates a new contact in the Auton system
 */

import { INodeTypeDescription } from '../../types';

export const pulselineCreateContactNode: INodeTypeDescription = {
  displayName: 'Create Contact',
  name: 'pulselineCreateContact',
  icon: 'fa:user-plus',
  group: ['contactManagement'],
  version: 1,
  description: 'Creates a new contact in Pulseline',
  keywords: ['add', 'new', 'lead', 'person', 'customer', 'subscriber', 'crm'],
  subtitle: '={{$parameter["name"] || $parameter["phoneNumber"] || $parameter["email"]}}',

  defaults: {
    name: 'Create Contact',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_create',
    apiEndpoint: '/api/contacts',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', description: 'ID of the created contact', required: true },
        { name: 'name', type: 'string', description: 'Contact full name' },
        { name: 'phoneNumber', type: 'string', description: 'Contact phone number' },
        { name: 'email', type: 'string', description: 'Contact email address' },
        { name: 'createdAt', type: 'string', description: 'Creation timestamp' },
      ],
    },
    loadOptionsMethods: {
      'getContactFields': {
        endpoint: '/api/customFields/fields-list?entityScope=contact',
        method: 'GET',
        responseMapping: {
          valueField: 'name',
          labelField: 'displayName',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Required Field Notice',
      name: 'requiredFieldNotice',
      type: 'notice',
      default: '',
      description: '⚠️ At least one contact identifier is required: You must provide either a Phone Number OR an Email address to create a contact.',
    },
    {
      displayName: 'Phone Number',
      name: 'phoneNumber',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      required: false,
      placeholder: '+1234567890',
      description: 'Phone number of the contact. If provided, contact will be created with SMS channel.',
    },
    {
      displayName: 'Email',
      name: 'email',
      type: 'string',
      default: '{{$contact.email}}',
      required: false,
      placeholder: 'contact@example.com',
      description: 'Email address of the contact. Required if phone number is not provided.',
    },
    {
      displayName: 'Name',
      name: 'name',
      type: 'string',
      default: '{{$contact.name}}',
      required: false,
      placeholder: 'John Doe',
      description: 'Full name of the contact',
    },
    {
      displayName: 'Notes',
      name: 'notes',
      type: 'string',
      typeOptions: {
        rows: 3,
      },
      default: '',
      required: false,
      placeholder: 'Additional notes about the contact',
      description: 'Any additional notes or information about the contact',
    },
    {
      displayName: 'Additional Custom Fields',
      name: 'contactFields',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      placeholder: 'Add Custom Field',
      description: 'Add additional custom contact fields (e.g., custom_lead_score, custom_source, etc.)',
      options: [
        {
          name: 'field',
          displayName: 'Field',
          values: [
            {
              displayName: 'Field Name',
              name: 'fieldName',
              type: 'options',
              typeOptions: {
                loadOptionsMethod: 'getContactFields',
              },
              default: '',
              description: 'Select a custom field to set',
            },
            {
              displayName: 'Field Value',
              name: 'fieldValue',
              type: 'string',
              default: '',
              placeholder: 'Field value or expression',
              description: 'Value to set for this field. Can use expressions like {{$json.customField}}',
            },
          ],
        },
      ],
    },
  ],
};
