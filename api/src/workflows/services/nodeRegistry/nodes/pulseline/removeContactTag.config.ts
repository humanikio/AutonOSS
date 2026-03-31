/**
 * Pulseline Remove Contact Tag Node Configuration
 * Removes a tag from a contact
 */

import { INodeTypeDescription } from '../../types';

export const pulselineRemoveContactTagNode: INodeTypeDescription = {
  displayName: 'Remove Contact Tag',
  name: 'pulselineRemoveContactTag',
  icon: 'fa:tag',
  group: ['contactManagement'],
  version: 1,
  description: 'Remove a tag from a contact',
  keywords: ['untag', 'delete', 'label', 'categorize', 'segment'],
  subtitle: '={{$parameter["tagId"]}}',

  defaults: {
    name: 'Remove Contact Tag',
    color: '#00d4ff',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_removeTag',
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/tags/{{$parameter["tagId"]}}/remove',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the tag was removed successfully', required: true },
        { name: 'contactId', type: 'string', description: 'ID of the contact' },
        { name: 'tagId', type: 'string', description: 'ID of the tag removed' },
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
      description: 'ID of the contact to remove tag from',
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
      description: 'Select the tag to remove from the contact',
      options: [], // Will be populated dynamically
    },
  ],
};
