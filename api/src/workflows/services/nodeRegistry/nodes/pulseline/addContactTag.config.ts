/**
 * Pulseline Add Contact Tag Node Configuration
 * Adds a tag to a contact
 */

import { INodeTypeDescription } from '../../types';

export const pulselineAddContactTagNode: INodeTypeDescription = {
  displayName: 'Add Contact Tag',
  name: 'pulselineAddContactTag',
  icon: 'fa:tag',
  group: ['contactManagement'],
  version: 1,
  description: 'Add a tag to a contact',
  keywords: ['label', 'categorize', 'segment', 'group', 'classify'],
  subtitle: '={{$parameter["tagId"]}}',

  defaults: {
    name: 'Add Contact Tag',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_addTag',
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/add',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the tag was added successfully', required: true },
        { name: 'contactId', type: 'string', description: 'ID of the contact' },
        { name: 'tagId', type: 'string', description: 'ID of the tag added' },
      ],
    },
    loadOptionsMethods: {
      getTags: {
        endpoint: '/api/contacts/tags',
        method: 'GET',
        responseMapping: {
          valueField: 'tagId',
          labelField: 'tagName',
          dataPath: 'tags', // Tags are nested in response.tags array
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$contact.contactId}}',
      required: true,
      placeholder: '{{$contact.contactId}}',
      description: 'ID of the contact to add tag to',
    },
    {
      displayName: 'Tag',
      name: 'tagId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getTags',
      },
      default: '',
      required: true,
      description: 'Select the tag to add to the contact',
      options: [], // Will be populated dynamically
    },
  ],
};
