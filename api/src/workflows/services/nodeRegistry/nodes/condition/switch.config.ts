/**
 * Switch Condition Node Configuration
 * Based on n8n's Switch node: packages/nodes-base/nodes/Switch/
 */

import { INodeTypeDescription } from '../../types';

export const switchNode: INodeTypeDescription = {
  displayName: 'Switch',
  name: 'switch',
  icon: 'fa:map-signs',
  group: ['flowControl'],
  version: [1, 2, 3],
  defaultVersion: 3,
  description: 'Route items to different branches based on rules',
  keywords: ['route', 'case', 'branch', 'multiple', 'condition', 'select'],
  subtitle: '={{$parameter["mode"]}}',

  defaults: {
    name: 'Switch',
    color: '#506000',
  },

  inputs: ['main'],
  outputs: '={{($parameter.options && $parameter.options.outputsCount) || 4}}',
  outputNames: '={{(new Array($parameter.options?.outputsCount || 4)).fill("").map((_, i) => `Output ${i}`)}}',

  properties: [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      options: [
        {
          name: 'Rules',
          value: 'rules',
          description: 'Route items based on comparison rules',
        },
        {
          name: 'Expression',
          value: 'expression',
          description: 'Route items based on JavaScript expression',
        },
      ],
      default: 'rules',
      description: 'How to decide which branch to send items to',
    },
    {
      displayName: 'Output',
      name: 'output',
      type: 'options',
      options: [
        {
          name: 'Output 0',
          value: 0,
        },
        {
          name: 'Output 1',
          value: 1,
        },
        {
          name: 'Output 2',
          value: 2,
        },
        {
          name: 'Output 3',
          value: 3,
        },
      ],
      default: 0,
      description: 'The output to which to route the item',
      displayOptions: {
        show: {
          mode: ['expression'],
        },
      },
    },
    {
      displayName: 'Rules',
      name: 'rules',
      placeholder: 'Add Rule',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      default: {},
      displayOptions: {
        show: {
          mode: ['rules'],
        },
      },
      options: [
        {
          name: 'rules',
          displayName: 'Rules',
          values: [
            {
              displayName: 'Conditions',
              name: 'conditions',
              placeholder: 'Add Condition',
              type: 'filter',
              default: {},
              typeOptions: {
                filter: {
                  caseSensitive: '={{ !$parameter.options.ignoreCase }}',
                  typeValidation: '={{ $parameter.options.looseTypeValidation ? "loose" : "strict" }}',
                },
              },
            },
            {
              displayName: 'Output',
              name: 'output',
              type: 'number',
              default: 0,
              typeOptions: {
                minValue: 0,
              },
              description: 'The output to route to if conditions match',
            },
          ],
        },
      ],
      description: 'Rules to match items against',
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add option',
      default: {},
      options: [
        {
          displayName: 'Number of Outputs',
          name: 'outputsCount',
          type: 'number',
          default: 4,
          typeOptions: {
            minValue: 2,
            maxValue: 16,
          },
          description: 'How many output branches to create',
        },
        {
          displayName: 'Fallback Output',
          name: 'fallbackOutput',
          type: 'options',
          options: [
            {
              name: 'None',
              value: -1,
            },
            {
              name: 'Output 0',
              value: 0,
            },
            {
              name: 'Output 1',
              value: 1,
            },
            {
              name: 'Output 2',
              value: 2,
            },
            {
              name: 'Output 3',
              value: 3,
            },
          ],
          default: -1,
          description: 'The output to route items that don\'t match any rules (-1 = discard)',
        },
      ],
    },
  ],

  hints: [
    {
      message: 'Switch routes items to different outputs based on your rules. Items that don\'t match any rule can be discarded or sent to a fallback output.',
      type: 'info',
      location: 'ndv',
    },
  ],

  _pulseline: {
    isCustomNode: false,
    apiEndpoint: '',
    httpMethod: 'GET',
    requiresAuth: false,
    transformationMethod: 'condition_switch', // Switch node transformation for subflow routing
  },
};
