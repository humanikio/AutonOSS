/**
 * IF Condition Node Configuration
 * Simplified version with type-specific operators
 */

import { INodeTypeDescription } from '../../types';

export const ifNode: INodeTypeDescription = {
  displayName: 'IF',
  name: 'if',
  icon: 'fa:map-signs',
  group: ['flowControl'],
  version: [2],
  defaultVersion: 2,
  description: 'Route workflow based on conditions',
  keywords: ['condition', 'branch', 'filter', 'check', 'compare', 'logic', 'true', 'false'],

  defaults: {
    name: 'IF',
    color: '#408000',
  },

  inputs: ['main'],
  outputs: ['main', 'main'],
  outputNames: ['true', 'false'],

  properties: [
    {
      displayName: 'Field to Check',
      name: 'field',
      type: 'string',
      default: '', // Start empty - will auto-populate on tagCheck mode
      placeholder: 'Select field from previous node',
      description: 'Field to evaluate from previous node output. Use the field selector (⚡) to select fields.',
      required: true,
      // Make it NOT required when tagCheck mode
      requiredOptions: {
        hide: {
          conditionType: ['tagCheck'],
        },
      },
      // Make it disabled (read-only) when tagCheck mode
      disabledOptions: {
        show: {
          conditionType: ['tagCheck'],
        },
      },
    },
    {
      displayName: 'Condition Type',
      name: 'conditionType',
      type: 'options',
      options: [
        {
          name: 'Boolean Check',
          value: 'boolean',
          description: 'Check if field is true or false',
        },
        {
          name: 'String Comparison',
          value: 'string',
          description: 'Compare string values',
        },
        {
          name: 'Number Comparison',
          value: 'number',
          description: 'Compare numeric values',
        },
        {
          name: 'Tag Check',
          value: 'tagCheck',
          description: 'Check if contact has specific tags',
        },
      ],
      default: 'boolean',
      description: 'Type of comparison to perform',
    },
    // Boolean operators
    {
      displayName: 'Boolean Operation',
      name: 'booleanOperation',
      type: 'options',
      displayOptions: {
        show: {
          conditionType: ['boolean'],
        },
      },
      options: [
        { name: 'Is True', value: 'true' },
        { name: 'Is False', value: 'false' },
      ],
      default: 'true',
      description: 'Check if field is true or false',
    },
    // String operators
    {
      displayName: 'String Operation',
      name: 'stringOperation',
      type: 'options',
      displayOptions: {
        show: {
          conditionType: ['string'],
        },
      },
      options: [
        { name: 'Equals', value: 'equals' },
        { name: 'Not Equals', value: 'notEquals' },
        { name: 'Contains', value: 'contains' },
        { name: 'Does Not Contain', value: 'notContains' },
        { name: 'Is Empty', value: 'isEmpty' },
        { name: 'Is Not Empty', value: 'isNotEmpty' },
      ],
      default: 'equals',
      description: 'String comparison operation',
    },
    // Number operators
    {
      displayName: 'Number Operation',
      name: 'numberOperation',
      type: 'options',
      displayOptions: {
        show: {
          conditionType: ['number'],
        },
      },
      options: [
        { name: 'Equals', value: 'equals' },
        { name: 'Not Equals', value: 'notEquals' },
        { name: 'Greater Than', value: 'greaterThan' },
        { name: 'Less Than', value: 'lessThan' },
        { name: 'Greater or Equal', value: 'greaterOrEqual' },
        { name: 'Less or Equal', value: 'lessOrEqual' },
      ],
      default: 'equals',
      description: 'Number comparison operation',
    },
    // Compare value for string operations
    {
      displayName: 'Compare To',
      name: 'compareValue',
      type: 'string',
      default: '',
      placeholder: 'Value or field to compare',
      description: 'Static value or field reference (use ⚡ to select field)',
      displayOptions: {
        show: {
          conditionType: ['string'],
          stringOperation: ['equals', 'notEquals', 'contains', 'notContains'],
        },
      },
    },
    // Compare value for number operations
    {
      displayName: 'Compare To',
      name: 'compareValue',
      type: 'string',
      default: '',
      placeholder: 'Number or field to compare',
      description: 'Static number or field reference (use ⚡ to select field)',
      displayOptions: {
        show: {
          conditionType: ['number'],
        },
      },
    },
    // Tag check operators
    {
      displayName: 'Tag Operation',
      name: 'tagOperation',
      type: 'options',
      displayOptions: {
        show: {
          conditionType: ['tagCheck'],
        },
      },
      options: [
        { name: 'Has Tag', value: 'hasTag', description: 'Contact has this specific tag' },
        { name: 'Does Not Have Tag', value: 'notHasTag', description: 'Contact does not have this tag' },
        { name: 'Has Any Tags', value: 'hasAnyTags', description: 'Contact has at least one tag' },
        { name: 'Has No Tags', value: 'hasNoTags', description: 'Contact has no tags' },
      ],
      default: 'hasTag',
      description: 'Tag checking operation',
    },
    // Tag selector
    {
      displayName: 'Select Tag',
      name: 'tagId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getContactTags',
      },
      default: undefined, // Use undefined instead of empty string to avoid "undefined" string
      required: true,
      description: 'Select the tag to check for',
      displayOptions: {
        show: {
          conditionType: ['tagCheck'],
          tagOperation: ['hasTag', 'notHasTag'],
        },
      },
    },
  ],

  _pulseline: {
    isCustomNode: false,
    apiEndpoint: '',
    httpMethod: 'GET',
    requiresAuth: false,
    transformationMethod: 'condition_if',
    loadOptionsMethods: {
      getContactTags: {
        endpoint: '/api/contacts/tags',
        method: 'GET',
        responseMapping: {
          valueField: 'tagId', // ContactTag interface uses 'tagId', not 'id'
          labelField: 'tagName',
          dataPath: 'tags',
        },
      },
    },
  },

  hints: [
    {
      message: 'The IF node has two outputs: "true" for when the condition is met, and "false" for when it\'s not. Use the ⚡ icon to select fields from previous nodes.',
      location: 'ndv',
      type: 'info',
    },
  ],
};
