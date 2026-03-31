/**
 * Merge Action Node Configuration
 * Based on n8n's Merge node: packages/nodes-base/nodes/Merge/
 */

import { INodeTypeDescription } from '../../types';

export const mergeNode: INodeTypeDescription = {
  displayName: 'Merge',
  name: 'merge',
  icon: 'fa:code-branch',
  group: ['flowControl'],
  version: [1, 2, 2.1, 3],
  defaultVersion: 3,
  description: 'Merge data from multiple workflow branches',
  keywords: ['combine', 'join', 'union', 'append', 'concat', 'branch'],
  subtitle: '={{$parameter["mode"]}}',

  defaults: {
    name: 'Merge',
    color: '#00cc22',
  },

  inputs: ['main', 'main'],
  inputNames: ['Input 1', 'Input 2'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      options: [
        {
          name: 'Append',
          value: 'append',
          description: 'Combine data from both inputs',
        },
        {
          name: 'Combine',
          value: 'combine',
          description: 'Combine data from inputs into a single output by matching fields',
        },
        {
          name: 'Choose Branch',
          value: 'chooseBranch',
          description: 'Output data from one specific branch',
        },
      ],
      default: 'append',
      description: 'How to merge the data',
    },
    {
      displayName: 'Combination Mode',
      name: 'combinationMode',
      type: 'options',
      displayOptions: {
        show: {
          mode: ['combine'],
        },
      },
      options: [
        {
          name: 'Merge By Index',
          value: 'mergeByIndex',
          description: 'Merge items based on their order (1st with 1st, 2nd with 2nd, etc.)',
        },
        {
          name: 'Merge By Key',
          value: 'mergeByKey',
          description: 'Merge items that have matching values for specified fields',
        },
        {
          name: 'Multiplex',
          value: 'multiplex',
          description: 'Create all possible combinations',
        },
      ],
      default: 'mergeByIndex',
      description: 'How to combine the data from both inputs',
    },
    {
      displayName: 'Fields to Match',
      name: 'mergeByFields',
      type: 'fixedCollection',
      placeholder: 'Add Field to Match',
      default: {},
      typeOptions: {
        multipleValues: true,
      },
      displayOptions: {
        show: {
          mode: ['combine'],
          combinationMode: ['mergeByKey'],
        },
      },
      options: [
        {
          name: 'values',
          displayName: 'Values',
          values: [
            {
              displayName: 'Input 1 Field',
              name: 'field1',
              type: 'string',
              default: '',
              requiresDataPath: 'single',
              description: 'The name of the field in input 1',
            },
            {
              displayName: 'Input 2 Field',
              name: 'field2',
              type: 'string',
              default: '',
              requiresDataPath: 'single',
              description: 'The name of the field in input 2',
            },
          ],
        },
      ],
      description: 'The fields to match on',
    },
    {
      displayName: 'Output',
      name: 'output',
      type: 'options',
      displayOptions: {
        show: {
          mode: ['chooseBranch'],
        },
      },
      options: [
        {
          name: 'Input 1',
          value: 'input1',
        },
        {
          name: 'Input 2',
          value: 'input2',
        },
      ],
      default: 'input1',
      description: 'Which input to output',
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Clashing Fields',
          name: 'clashHandling',
          type: 'options',
          displayOptions: {
            show: {
              '/mode': ['combine'],
            },
          },
          options: [
            {
              name: 'Prefer Input 1',
              value: 'preferInput1',
            },
            {
              name: 'Prefer Input 2',
              value: 'preferInput2',
            },
            {
              name: 'Add Suffix to Field Names',
              value: 'addSuffix',
            },
          ],
          default: 'preferInput1',
          description: 'What to do if both inputs have a field with the same name',
        },
        {
          displayName: 'Include Unpaired Items',
          name: 'includeUnpaired',
          type: 'boolean',
          default: false,
          displayOptions: {
            show: {
              '/mode': ['combine'],
              '/combinationMode': ['mergeByKey'],
            },
          },
          description: 'Whether to include items that don\'t have a match in both inputs',
        },
      ],
    },
  ],

  hints: [
    {
      message: 'Merge combines data from different workflow branches. Use it after a Split in Batches or IF node to bring data back together.',
      type: 'info',
      location: 'ndv',
    },
  ],
};
