/**
 * Pulseline Create Opportunity Node Configuration
 * Creates a new opportunity in a pipeline
 */

import { INodeTypeDescription } from '../../types';

export const pulselineCreateOpportunityNode: INodeTypeDescription = {
  displayName: 'Create Opportunity',
  name: 'pulselineCreateOpportunity',
  icon: 'fa:bullseye',
  group: ['opportunities'],
  version: 1,
  description: 'Creates a new opportunity in a pipeline',
  keywords: ['deal', 'sale', 'pipeline', 'stage', 'revenue', 'prospect', 'lead', 'crm'],
  subtitle: '={{$parameter["name"]}}',

  defaults: {
    name: 'Create Opportunity',
    color: '#10B981',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    apiEndpoint: '/api/opportunities/opportunities',
    httpMethod: 'POST',
    requiresAuth: true,
    transformationMethod: 'opportunity_create',
    successResponse: {
      fields: [
        { name: 'id', type: 'string', description: 'ID of the created opportunity', required: true },
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
      displayName: 'Opportunity Name',
      name: 'name',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'New Sales Deal',
      description: 'Name of the opportunity',
    },
    {
      displayName: 'Pipeline',
      name: 'pipelineId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getPipelines',
      },
      default: '',
      required: true,
      description: 'Select the pipeline for this opportunity',
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
      required: true,
      description: 'Select the stage within the pipeline',
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
      default: 0,
      required: true,
      description: 'Monetary value of the opportunity',
      typeOptions: {
        minValue: 0,
      },
    },
    {
      displayName: 'Source',
      name: 'source',
      type: 'string',
      default: 'workflow',
      required: true,
      placeholder: 'website, referral, cold call',
      description: 'Source of the opportunity',
    },
    {
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$json.contactId}}',
      placeholder: '={{$json.contactId}}',
      description: 'ID of the contact associated with this opportunity (auto-populated from previous node)',
    },
    {
      displayName: 'Description',
      name: 'description',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '',
      placeholder: 'Opportunity details...',
      description: 'Description of the opportunity',
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
      default: 'medium',
      description: 'Priority level of the opportunity',
    },
    {
      displayName: 'Expected Close Date',
      name: 'expectedCloseDate',
      type: 'dateTime',
      default: '',
      placeholder: '2025-12-31',
      description: 'Expected date to close the opportunity',
    },
    {
      displayName: 'Tags',
      name: 'tags',
      type: 'string',
      default: '',
      placeholder: 'enterprise, hot-lead',
      description: 'Comma-separated tags for the opportunity',
    },
  ],
};
