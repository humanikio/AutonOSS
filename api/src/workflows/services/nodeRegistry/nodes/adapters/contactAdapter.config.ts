/**
 * Contact Adapter Node Configuration
 * Internal adapter that fetches complete contact data
 *
 * This node is invisible in the frontend UI and auto-injected by the custom field resolver.
 * It fetches ALL contact fields (standard + custom) from the contacts API,
 * making them available to downstream nodes via {{$contact.fieldName}} syntax.
 *
 * Placement Strategy:
 * - Placed after trigger (if trigger has contactId)
 * - Placed after FindContact node (higher weight - fresher data)
 * - Automatically repositioned based on weighted contact sources
 */

import { INodeTypeDescription } from '../../types';

export const contactAdapterNode: INodeTypeDescription = {
  displayName: 'Contact Adapter',
  name: 'contactAdapter',
  icon: 'fa:user-cog',
  group: ['adapter'],
  version: 1,
  description: 'Internal adapter for contact field resolution. Automatically injected - do not add manually.',
  hidden: true,  // Hide from search results - internal system node
  subtitle: 'Fetches complete contact data',

  defaults: {
    name: 'Contact Adapter',
    color: '#6B7280', // Gray - indicates system/internal node
  },

  inputs: ['main'],
  outputs: ['main'],

  // Pulseline custom metadata for adapter nodes
  _pulseline: {
    isCustomNode: true,
    isAdapter: true,        // NEW: Marks this as an adapter node
    adapterType: 'contact', // NEW: Type of adapter for routing logic
    transformationMethod: 'adapter_contact', // Declarative transformation to n8n HTTP request
    apiEndpoint: '/api/contacts/{{$parameter["contactId"]}}/flattened',
    httpMethod: 'GET',
    requiresAuth: true,
    continueOnFail: true,   // Allow workflow to continue even if contact fetch fails (e.g., contact not found, API error)

    // Success response defines ALL contact fields
    // The /flattened endpoint returns fields as simple key-value pairs
    // These are available as {{$node["contactAdapter-X"].json.fieldName}}
    successResponse: {
      fields: [
        // Standard contact fields
        { name: 'contactId', type: 'string', description: 'Unique contact identifier', required: true },
        { name: 'id', type: 'string', description: 'Contact ID (alias)', required: true },
        { name: 'name', type: 'string', description: 'Full name' },
        { name: 'firstName', type: 'string', description: 'First name' },
        { name: 'lastName', type: 'string', description: 'Last name' },
        { name: 'email', type: 'string', description: 'Email address' },
        { name: 'phoneNumber', type: 'string', description: 'Phone number' },
        { name: 'dateOfBirth', type: 'string', description: 'Date of birth' },
        { name: 'notes', type: 'string', description: 'Contact notes' },
        { name: 'tags', type: 'array', description: 'Array of tag IDs assigned to contact' },
        { name: 'created_at', type: 'string', description: 'Creation timestamp' },
        { name: 'updated_at', type: 'string', description: 'Last update timestamp' },
        { name: 'tenant_id', type: 'string', description: 'Tenant ID' },

        // Note: Custom fields are also included at the root level
        // Any custom field defined by the tenant will be accessible as json.customFieldName
      ],
    },
  },

  // Parameters for the adapter node
  properties: [
    {
      displayName: 'Contact ID Source',
      name: 'contactId',
      type: 'string',
      default: '',
      required: true,
      description: 'Expression that resolves to the contact ID. Auto-populated by custom field resolver.',
      placeholder: '={{$json.body.contactId}}',
    },
  ],
};
