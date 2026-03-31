/**
 * Auton Update Contact Node Configuration
 * Updates an existing contact in the Auton system
 */

import { INodeTypeDescription } from '../../types';

export const pulselineUpdateContactNode: INodeTypeDescription = {
  displayName: 'Update Contact',
  name: 'pulselineUpdateContact',
  icon: 'fa:user-edit',
  group: ['contactManagement'],
  version: 1,
  description: 'Updates an existing contact in Pulseline',
  keywords: ['edit', 'modify', 'change', 'lead', 'person', 'customer', 'crm'],
  subtitle: '={{$parameter["contactId"]}}',

  defaults: {
    name: 'Update Contact',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_update',
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/manage',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'contactId', type: 'string', description: 'ID of the updated contact', required: true },
        { name: 'name', type: 'string', description: 'Contact full name' },
        { name: 'phoneNumber', type: 'string', description: 'Contact phone number' },
        { name: 'email', type: 'string', description: 'Contact email address' },
        { name: 'updatedAt', type: 'string', description: 'Last update timestamp' },
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
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'abc123...',
      description: 'ID of the contact to update. Can use {{$json.body.contactId}} from previous node',
    },
    {
      displayName: 'Contact Fields',
      name: 'contactFields',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      placeholder: 'Add Field',
      description: 'Contact fields to update (name, email, phone, custom fields, etc.)',
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
              description: 'Select a contact field to update',
            },
            {
              displayName: 'Field Value',
              name: 'fieldValue',
              type: 'string',
              default: '',
              placeholder: 'Field value or expression',
              description: 'Value to set for this field. Can use expressions like {{$json.name}}',
            },
          ],
        },
      ],
    },
  ],
};
