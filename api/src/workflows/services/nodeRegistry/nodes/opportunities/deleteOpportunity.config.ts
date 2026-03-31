/**
 * Pulseline Delete Opportunity Node Configuration
 * Deletes an existing opportunity by ID OR auto-resolves from Contact ID
 */

import { INodeTypeDescription } from '../../types';

export const pulselineDeleteOpportunityNode: INodeTypeDescription = {
  displayName: 'Delete Opportunity',
  name: 'pulselineDeleteOpportunity',
  icon: 'fa:trash',
  group: ['opportunities'],
  version: 1,
  description: 'Deletes an opportunity. Provide either Opportunity ID or Contact ID to auto-find and delete the latest opportunity.',
  keywords: ['deal', 'sale', 'remove', 'close', 'lost', 'crm'],
  subtitle: '={{$parameter["opportunityId"] || "Auto-resolve from Contact"}}',

  defaults: {
    name: 'Delete Opportunity',
    color: '#EF4444',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    apiEndpoint: '/api/opportunities/opportunities',
    httpMethod: 'DELETE',
    requiresAuth: true,
    continueOnFail: true,
    transformationMethod: 'opportunity_delete',
    successResponse: {
      fields: [
        { name: 'message', type: 'string', description: 'Success message', required: true },
        { name: 'opportunityId', type: 'string', description: 'ID of the deleted opportunity', required: true },
      ],
    },
  },

  properties: [
    {
      displayName: 'Delete Method',
      name: 'deleteMethod',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {},
      },
      description: '💡 Provide either "Opportunity ID" OR "Contact ID" below. If Contact ID is provided without Opportunity ID, the latest active opportunity for that contact will be deleted.',
    },
    {
      displayName: 'Opportunity ID (Optional)',
      name: 'opportunityId',
      type: 'string',
      default: '',
      required: false,
      placeholder: '={{$json.opportunityId}}',
      description: 'Specific opportunity ID to delete. Leave empty to auto-find from Contact ID.',
    },
    {
      displayName: 'Contact ID (For Auto-Resolve)',
      name: 'contactId',
      type: 'string',
      default: '',
      placeholder: '={{$json.contactId}}',
      description: '🔍 If Opportunity ID is not provided, this will find and delete the latest active opportunity for this contact.',
    },
  ],
};
