/**
 * Set Action Node Configuration
 * Based on n8n's Set node: packages/nodes-base/nodes/Set/
 */

import { INodeTypeDescription } from '../../types';

export const setNode: INodeTypeDescription = {
  displayName: 'Set',
  name: 'set',
  icon: 'fa:pen',
  group: ['dataTransform'],
  version: [1, 2, 3],
  defaultVersion: 3,
  description: 'Add, remove, and modify fields in items',
  keywords: ['assign', 'variable', 'field', 'data', 'map', 'transform', 'value'],
  subtitle: '',

  defaults: {
    name: 'Set',
    color: '#0000FF',
  },

  inputs: ['main'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      options: [
        {
          name: 'Manual Mapping',
          value: 'manual',
          description: 'Manually map fields',
        },
        {
          name: 'Remove Other Fields',
          value: 'removeOtherFields',
          description: 'Only keep the fields you specify',
        },
      ],
      default: 'manual',
      description: 'How to set the values',
    },
    {
      displayName: 'Fields to Set',
      name: 'fields',
      placeholder: 'Add Field',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
        sortable: true,
      },
      description: 'The fields to set',
      default: {},
      options: [
        {
          name: 'values',
          displayName: 'Values',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              default: '',
              placeholder: 'e.g. fieldName',
              description: 'Name of the field to set the value of',
              requiresDataPath: 'single',
            },
            {
              displayName: 'Type',
              name: 'type',
              type: 'options',
              options: [
                {
                  name: 'String',
                  value: 'stringValue',
                },
                {
                  name: 'Number',
                  value: 'numberValue',
                },
                {
                  name: 'Boolean',
                  value: 'booleanValue',
                },
                {
                  name: 'Array',
                  value: 'arrayValue',
                },
                {
                  name: 'Object',
                  value: 'objectValue',
                },
              ],
              default: 'stringValue',
              description: 'The field value type',
            },
            {
              displayName: 'Value',
              name: 'stringValue',
              type: 'string',
              default: '',
              displayOptions: {
                show: {
                  type: ['stringValue'],
                },
              },
              description: 'Value of the field to set',
            },
            {
              displayName: 'Value',
              name: 'numberValue',
              type: 'number',
              default: 0,
              displayOptions: {
                show: {
                  type: ['numberValue'],
                },
              },
              description: 'Value of the field to set',
            },
            {
              displayName: 'Value',
              name: 'booleanValue',
              type: 'boolean',
              default: false,
              displayOptions: {
                show: {
                  type: ['booleanValue'],
                },
              },
              description: 'Value of the field to set',
            },
            {
              displayName: 'Value',
              name: 'arrayValue',
              type: 'string',
              default: '',
              displayOptions: {
                show: {
                  type: ['arrayValue'],
                },
              },
              description: 'Value of the field to set (as JSON array)',
              placeholder: '["item1", "item2", "item3"]',
            },
            {
              displayName: 'Value',
              name: 'objectValue',
              type: 'json',
              default: '{}',
              displayOptions: {
                show: {
                  type: ['objectValue'],
                },
              },
              description: 'Value of the field to set (as JSON object)',
            },
          ],
        },
      ],
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Include Other Fields',
          name: 'includeOtherFields',
          type: 'boolean',
          default: false,
          description: 'Whether to include all fields from the input data',
          displayOptions: {
            show: {
              '/mode': ['manual'],
            },
          },
        },
        {
          displayName: 'Ignore Type Conversion Errors',
          name: 'ignoreConversionErrors',
          type: 'boolean',
          default: false,
          description: 'Whether to ignore when a field cannot be converted to the selected type',
        },
      ],
    },
  ],

  hints: [
    {
      message: 'Use this node to reshape data by adding, modifying, or removing fields',
      type: 'info',
      location: 'ndv',
    },
  ],
};
