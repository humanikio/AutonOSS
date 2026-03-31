/**
 * Pulseline Delete Contact Node Configuration
 * Deletes a contact from the Pulseline system
 */

import { INodeTypeDescription } from '../../types';

export const pulselineDeleteContactNode: INodeTypeDescription = {
  displayName: 'Delete Contact',
  name: 'pulselineDeleteContact',
  icon: 'fa:user-times',
  group: ['contactManagement'],
  version: 1,
  description: 'Deletes a contact from Pulseline',
  keywords: ['remove', 'destroy', 'lead', 'person', 'customer', 'crm'],
  subtitle: '={{$parameter["contactId"]}}',

  defaults: {
    name: 'Delete Contact',
    color: '#ff4444',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'contact_delete',
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}',
    httpMethod: 'DELETE',
    requiresAuth: true,
    requiresConfirmation: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether deletion was successful', required: true },
        { name: 'contactId', type: 'string', description: 'ID of the deleted contact' },
        { name: 'deletedAt', type: 'string', description: 'Deletion timestamp' },
      ],
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
      description: 'ID of the contact to delete. Can use {{$json.body.contactId}} from previous node',
    },
    {
      displayName: 'Confirm Deletion',
      name: 'confirmDelete',
      type: 'boolean',
      default: false,
      description: 'WARNING: This action cannot be undone. Check this box to confirm deletion.',
    },
  ],
};
