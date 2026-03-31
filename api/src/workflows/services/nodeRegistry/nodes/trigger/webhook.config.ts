/**
 * Webhook Trigger Node Configuration
 * Based on n8n's Webhook node: packages/nodes-base/nodes/Webhook/Webhook.node.ts
 */

import { INodeTypeDescription } from '../../types';

export const webhookNode: INodeTypeDescription = {
  displayName: 'Webhook',
  name: 'webhook',
  icon: { light: 'file:webhook.svg', dark: 'file:webhook.dark.svg' },
  group: ['trigger'],
  version: [1, 2],
  defaultVersion: 2,
  description: 'Starts the workflow when a webhook is called',
  keywords: ['http', 'api', 'endpoint', 'url', 'request', 'incoming', 'receive', 'listen', 'start'],
  subtitle: '',

  eventTriggerDescription: 'Waiting for you to call the Test URL',
  activationMessage: 'You can now make calls to your production webhook URL.',

  defaults: {
    name: 'Webhook',
    color: '#FF6D5A',
  },

  // Parameter auto-generation on node creation
  parameterDefaults: {
    httpMethod: {
      value: 'POST',
      pattern: 'static',
    },
    path: {
      value: 'webhook-',
      pattern: 'timestamp', // Will append Date.now()
    },
    authentication: {
      value: 'none',
      pattern: 'static',
    },
    responseMode: {
      value: 'onReceived',
      pattern: 'static',
    },
    responseCode: {
      value: 200,
      pattern: 'static',
    },
    options: {
      value: {},
      pattern: 'static',
    },
  },

  inputs: [],
  outputs: ['main'],

  // Pulseline custom metadata
  _pulseline: {
    isCustomNode: false, // This is a native n8n node
    transformationMethod: 'native_webhook', // Declarative transformation to n8n webhook
    apiEndpoint: '',
    httpMethod: 'POST',
    requiresAuth: false,
  },

  supportsCORS: true,

  triggerPanel: {
    header: '',
    executionsHelp: {
      inactive:
        'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Activate the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
      active:
        'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
    },
    activationHint:
      "Once you've finished building your workflow, run it without having to click this button by using the production webhook URL.",
  },

  webhooks: [
    {
      name: 'default',
      httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
      path: '={{$parameter["path"]}}',
      responseMode: '={{$parameter["responseMode"]}}',
      responseData: '={{$parameter["responseData"]}}',
      responseCode: '={{$parameter["responseCode"] || 200}}',
      isFullPath: true,
    },
  ],

  properties: [
    {
      displayName: 'HTTP Method',
      name: 'httpMethod',
      type: 'options',
      options: [
        {
          name: 'DELETE',
          value: 'DELETE',
        },
        {
          name: 'GET',
          value: 'GET',
        },
        {
          name: 'HEAD',
          value: 'HEAD',
        },
        {
          name: 'PATCH',
          value: 'PATCH',
        },
        {
          name: 'POST',
          value: 'POST',
        },
        {
          name: 'PUT',
          value: 'PUT',
        },
      ],
      default: 'GET',
      description: 'The HTTP method to listen to',
    },
    {
      displayName: 'Path',
      name: 'path',
      type: 'string',
      default: '',
      placeholder: 'webhook',
      required: true,
      description:
        "The path to listen to, dynamic values could be specified by using ':', e.g. 'your-path/:dynamic-value'",
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'options',
      options: [
        {
          name: 'Basic Auth',
          value: 'basicAuth',
        },
        {
          name: 'Header Auth',
          value: 'headerAuth',
        },
        {
          name: 'None',
          value: 'none',
        },
      ],
      default: 'none',
      description: 'The way to authenticate',
    },
    {
      displayName: 'Respond',
      name: 'responseMode',
      type: 'options',
      options: [
        {
          name: 'Immediately',
          value: 'onReceived',
          description: 'As soon as this node executes',
        },
        {
          name: 'When Last Node Finishes',
          value: 'lastNode',
          description: 'Returns data of the last-executed node',
        },
        {
          name: "Using 'Respond to Webhook' Node",
          value: 'responseNode',
          description: 'Response defined in that node',
        },
      ],
      default: 'onReceived',
      description: 'When and how to respond to the webhook',
    },
    {
      displayName: 'Response Code',
      name: 'responseCode',
      type: 'number',
      typeOptions: {
        minValue: 100,
        maxValue: 599,
      },
      default: 200,
      description: 'The HTTP Response code to return',
      displayOptions: {
        hide: {
          responseMode: ['responseNode'],
        },
      },
    },
    {
      displayName: 'Response Data',
      name: 'responseData',
      type: 'options',
      options: [
        {
          name: 'All Entries',
          value: 'allEntries',
          description: 'Returns all the entries of the last node',
        },
        {
          name: 'First Entry JSON',
          value: 'firstEntryJson',
          description: 'Returns the JSON data of the first entry of the last node',
        },
        {
          name: 'First Entry Binary',
          value: 'firstEntryBinary',
          description: 'Returns the binary data of the first entry of the last node',
        },
        {
          name: 'No Response Body',
          value: 'noData',
          description: 'Returns without a body',
        },
      ],
      default: 'firstEntryJson',
      description: 'What data should be returned',
      displayOptions: {
        show: {
          responseMode: ['lastNode'],
        },
      },
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Binary Data',
          name: 'binaryData',
          type: 'boolean',
          default: false,
          description: 'Whether the webhook will receive binary data',
        },
        {
          displayName: 'Binary Property',
          name: 'binaryPropertyName',
          type: 'string',
          default: 'data',
          description: 'Name of the binary property to write to',
          displayOptions: {
            show: {
              binaryData: [true],
            },
          },
        },
        {
          displayName: 'Ignore Bots',
          name: 'ignoreBots',
          type: 'boolean',
          default: false,
          description: 'Whether to ignore requests from bots like link previewers and web crawlers',
        },
        {
          displayName: 'Raw Body',
          name: 'rawBody',
          type: 'boolean',
          default: false,
          description: 'Whether to return the raw body',
        },
      ],
    },
  ],

  credentials: [
    {
      name: 'httpBasicAuth',
      required: true,
      displayOptions: {
        show: {
          authentication: ['basicAuth'],
        },
      },
    },
    {
      name: 'httpHeaderAuth',
      required: true,
      displayOptions: {
        show: {
          authentication: ['headerAuth'],
        },
      },
    },
  ],
};
