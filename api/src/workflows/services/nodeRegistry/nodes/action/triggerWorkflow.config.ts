/**
 * Trigger Workflow Action Node Configuration
 * Executes another workflow by posting to its production webhook URL
 */

import { INodeTypeDescription } from '../../types';

export const triggerWorkflowNode: INodeTypeDescription = {
  displayName: 'Trigger Workflow',
  name: 'triggerWorkflow',
  icon: 'fa:play-circle',
  group: ['automation'],
  version: 1,
  description: 'Trigger another workflow to execute. Select a workflow and pass data to it.',
  keywords: ['execute', 'run', 'start', 'subworkflow', 'chain', 'invoke'],
  subtitle: '={{$parameter["workflowId"]}}',

  defaults: {
    name: 'Trigger Workflow',
    color: '#9333EA',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'action_triggerWorkflow',
    apiEndpoint: '/api/workflows/workflows/trigger',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether workflow was triggered successfully', required: true },
        { name: 'executionId', type: 'string', description: 'n8n execution ID of triggered workflow' },
        { name: 'workflowId', type: 'string', description: 'ID of the triggered workflow' },
        { name: 'message', type: 'string', description: 'Success message' },
      ],
    },
    loadOptionsMethods: {
      getWorkflows: {
        endpoint: '/api/workflows/workflows',
        method: 'GET',
        responseMapping: {
          valueField: 'id',
          labelField: 'name',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Workflow',
      name: 'workflowId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getWorkflows',
      },
      default: '',
      required: true,
      description: 'Select the workflow to trigger',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Payload Mode',
      name: 'payloadMode',
      type: 'options',
      options: [
        {
          name: 'Field-Value Pairs',
          value: 'fields',
          description: 'Build payload using individual fields with custom variables',
        },
        {
          name: 'Pass Through All Data',
          value: 'passthrough',
          description: 'Send all data from previous node',
        },
        {
          name: 'Raw JSON',
          value: 'json',
          description: 'Provide raw JSON payload',
        },
      ],
      default: 'fields',
      description: 'How to construct the payload to send to the workflow',
    },
    {
      displayName: 'Payload Fields',
      name: 'payloadFields',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      placeholder: 'Add Field',
      default: {
        field: [
          {
            name: 'contactId',
            value: '{{$contact.contactId}}',
          },
        ],
      },
      displayOptions: {
        show: {
          payloadMode: ['fields'],
        },
      },
      options: [
        {
          name: 'field',
          displayName: 'Field',
          values: [
            {
              displayName: 'Field Name',
              name: 'name',
              type: 'string',
              default: '',
              placeholder: 'contactId',
              description: 'Name of the field to send',
            },
            {
              displayName: 'Field Value',
              name: 'value',
              type: 'string',
              default: '',
              placeholder: '={{ $json.contactId }}',
              description: 'Value of the field. Use ⚡ to insert fields from previous nodes.',
            },
          ],
        },
      ],
      description: 'Fields to send in the payload',
    },
    {
      displayName: 'Payload JSON',
      name: 'payload',
      type: 'json',
      default: '{\n  \n}',
      displayOptions: {
        show: {
          payloadMode: ['json'],
        },
      },
      description: 'Raw JSON payload to send. Use expressions like ={{ $json.contactId }} for dynamic values.',
      placeholder: '{\n  "contactId": "={{ $json.contactId }}",\n  "customField": "value"\n}',
    },
  ],
};
