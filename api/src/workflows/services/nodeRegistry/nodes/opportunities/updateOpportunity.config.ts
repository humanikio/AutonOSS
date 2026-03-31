/**
 * Pulseline Update Opportunity Node Configuration
 * Updates an existing opportunity by ID OR auto-resolves from Contact ID
 */

import { INodeTypeDescription } from '../../types';

export const pulselineUpdateOpportunityNode: INodeTypeDescription = {
  displayName: 'Update Opportunity',
  name: 'pulselineUpdateOpportunity',
  icon: 'fa:edit',
  group: ['opportunities'],
  version: 1,
  description: 'Updates an opportunity. Provide either Opportunity ID or Contact ID to auto-find the latest opportunity.',
  keywords: ['deal', 'sale', 'pipeline', 'stage', 'move', 'modify', 'edit', 'crm'],
  subtitle: '={{$parameter["opportunityId"] || "Auto-resolve from Contact"}}',

  defaults: {
    name: 'Update Opportunity',
    color: '#10B981',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    apiEndpoint: '/api/opportunities/opportunities',
    httpMethod: 'PUT',
    requiresAuth: true,
    continueOnFail: true,
    transformationMethod: 'opportunity_update',
    successResponse: {
      fields: [
        { name: 'id', type: 'string', description: 'ID of the updated opportunity', required: true },
        { name: 'name', type: 'string', description: 'Opportunity name' },
        { name: 'pipelineId', type: 'string', description: 'Pipeline ID' },
        { name: 'stageId', type: 'string', description: 'Stage ID' },
        { name: 'value', type: 'number', description: 'Opportunity value' },
        { name: 'source', type: 'string', description: 'Source of the opportunity' },
        { name: 'contactId', type: 'string', description: 'Associated contact ID' },
        { name: 'priority', type: 'string', description: 'Priority level' },
        { name: 'dateCreated', type: 'string', description: 'Creation timestamp' },
        { name: 'lastModified', type: 'string', description: 'Last modified timestamp' },
      ],
    },
    loadOptionsMethods: {
      getPipelines: {
        endpoint: '/api/opportunities/pipelines',
        method: 'GET',
        responseMapping: {
          valueField: 'id',
          labelField: 'name',
        },
      },
      getStages: {
        endpoint: '/api/opportunities/pipelines/{{$parameter["pipelineId"]}}/stages',
        method: 'GET',
        responseMapping: {
          valueField: 'id',
          labelField: 'name',
        },
        dependsOn: ['pipelineId'],
      },
    },
  },

  properties: [
    {
      displayName: 'Update Method',
      name: 'updateMethod',
      type: 'notice',
      default: '',
      displayOptions: {
        show: {},
      },
      description: '💡 Provide either "Opportunity ID" OR "Contact ID" below. If Contact ID is provided without Opportunity ID, the latest active opportunity for that contact will be updated.',
    },
    {
      displayName: 'Opportunity ID (Optional)',
      name: 'opportunityId',
      type: 'string',
      default: '',
      required: false,
      placeholder: '={{$json.opportunityId}}',
      description: 'Specific opportunity ID to update. Leave empty to auto-find from Contact ID.',
    },
    {
      displayName: 'Contact ID (For Auto-Resolve)',
      name: 'contactId',
      type: 'string',
      default: '',
      placeholder: '={{$json.contactId}}',
      description: '🔍 If Opportunity ID is not provided, this will find and update the latest active opportunity for this contact.',
    },
    {
      displayName: 'Opportunity Name',
      name: 'name',
      type: 'string',
      default: '',
      placeholder: 'Updated Deal Name',
      description: 'Update the name of the opportunity',
    },
    {
      displayName: 'Pipeline',
      name: 'pipelineId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getPipelines',
      },
      default: '',
      description: 'Update the pipeline for this opportunity',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Stage',
      name: 'stageId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getStages',
      },
      default: '',
      description: 'Update the stage within the pipeline',
      displayOptions: {
        show: {
          pipelineId: ['*'],  // Show when any pipeline is selected
        },
      },
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Value',
      name: 'value',
      type: 'number',
      default: '',
      description: 'Update the monetary value of the opportunity',
      typeOptions: {
        minValue: 0,
      },
    },
    {
      displayName: 'Source',
      name: 'source',
      type: 'string',
      default: '',
      placeholder: 'website, referral, cold call',
      description: 'Update the source of the opportunity',
    },
    {
      displayName: 'Description',
      name: 'description',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '',
      placeholder: 'Updated opportunity details...',
      description: 'Update the description of the opportunity',
    },
    {
      displayName: 'Priority',
      name: 'priority',
      type: 'options',
      options: [
        {
          name: 'Low',
          value: 'low',
        },
        {
          name: 'Medium',
          value: 'medium',
        },
        {
          name: 'High',
          value: 'high',
        },
      ],
      default: '',
      description: 'Update the priority level of the opportunity',
    },
    {
      displayName: 'Expected Close Date',
      name: 'expectedCloseDate',
      type: 'dateTime',
      default: '',
      placeholder: '2025-12-31',
      description: 'Update the expected date to close the opportunity',
    },
    {
      displayName: 'Tags',
      name: 'tags',
      type: 'string',
      default: '',
      placeholder: 'enterprise, hot-lead',
      description: 'Update comma-separated tags for the opportunity',
    },
  ],
};
