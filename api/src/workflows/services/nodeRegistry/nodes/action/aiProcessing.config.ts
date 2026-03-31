/**
 * AI Processing Action Node Configuration
 * Processes prompts using Claude AI
 */

import { INodeTypeDescription } from '../../types';

export const aiProcessingNode: INodeTypeDescription = {
  displayName: 'AI Processing',
  name: 'aiProcessing',
  icon: 'fa:robot',
  group: ['ai'],
  version: 1,
  description: 'Process prompts using Claude AI and return the response',
  keywords: ['llm', 'claude', 'gpt', 'prompt', 'generate', 'analyze', 'summarize'],
  subtitle: '={{$parameter["prompt"] ? $parameter["prompt"].substring(0, 50) + "..." : "AI Processing"}}',

  defaults: {
    name: 'AI Processing',
    color: '#7C3AED',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'action_aiProcessing',
    apiEndpoint: '/api/workflows/ai-processing/process',
    httpMethod: 'POST',
    requiresAuth: true,
    successResponse: {
      fields: [
        { name: 'caseId', type: 'string', description: 'ID of the processing case', required: true },
        { name: 'response', type: 'string', description: 'Claude AI response', required: true },
      ],
    },
  },

  properties: [
    // HIDDEN FIELDS (auto-populated in frontend when node is created)
    {
      displayName: 'Workflow ID',
      name: 'workflowId',
      type: 'hidden',
      default: '',
      required: true,
      description: 'Workflow ID (auto-populated)',
    },
    {
      displayName: 'Node ID',
      name: 'nodeId',
      type: 'hidden',
      default: '',
      required: true,
      description: 'Node ID (auto-populated)',
    },
    {
      displayName: 'Node Name',
      name: 'nodeName',
      type: 'hidden',
      default: 'aiProcessing',
      required: false,
      description: 'Node type name (auto-populated)',
    },
    // VISIBLE FIELDS
    {
      displayName: 'Model',
      name: 'model',
      type: 'options',
      options: [
        {
          name: 'Claude Sonnet 4.5',
          value: 'claude-sonnet-4-5-20250929',
        },
      ],
      default: 'claude-sonnet-4-5-20250929',
      required: true,
      description: 'AI model to use for processing',
    },
    {
      displayName: 'Prompt',
      name: 'prompt',
      type: 'string',
      typeOptions: {
        rows: 8,
      },
      default: '',
      required: true,
      placeholder: 'Enter your prompt here...\n\nYou can use the ⚡ button to insert fields from previous nodes.\n\nExample:\nSummarize this conversation: {{ $json.conversationText }}',
      description: 'The prompt to send to Claude AI. Use {{ }} syntax to insert dynamic values from previous nodes.',
    },
  ],
};
