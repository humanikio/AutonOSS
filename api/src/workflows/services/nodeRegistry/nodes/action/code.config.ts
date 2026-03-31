/**
 * Code Action Node Configuration
 * Based on n8n's Code node: packages/nodes-base/nodes/Code/
 */

import { INodeTypeDescription } from '../../types';

export const codeNode: INodeTypeDescription = {
  displayName: 'Code',
  name: 'code',
  icon: 'fa:code',
  group: ['dataTransform'],
  version: [1, 2],
  defaultVersion: 2,
  description: 'Run custom JavaScript code',
  keywords: ['javascript', 'script', 'transform', 'function', 'custom', 'logic', 'execute'],
  subtitle: '',

  defaults: {
    name: 'Code',
    color: '#FF9922',
  },

  inputs: ['main'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      noDataExpression: true,
      options: [
        {
          name: 'Run Once for All Items',
          value: 'runOnceForAllItems',
          description: 'Run code once with all items at once',
        },
        {
          name: 'Run Once for Each Item',
          value: 'runOnceForEachItem',
          description: 'Run code once for every item',
        },
      ],
      default: 'runOnceForAllItems',
      description: 'How code should be run',
    },
    {
      displayName: 'JavaScript',
      name: 'jsCode',
      type: 'string',
      typeOptions: {
        editor: 'codeNodeEditor',
        editorLanguage: 'javaScript',
        rows: 10,
      },
      default: '// Code runs once for all items\n// Access items using $input.all()\n// Return an array of items\n\nconst items = $input.all();\n\nconst newItems = items.map(item => {\n  return {\n    json: {\n      ...item.json,\n      // Add your transformations here\n      myNewField: \'hello world\'\n    }\n  };\n});\n\nreturn newItems;',
      description: 'JavaScript code to execute',
      displayOptions: {
        show: {
          mode: ['runOnceForAllItems'],
        },
      },
    },
    {
      displayName: 'JavaScript',
      name: 'jsCode',
      type: 'string',
      typeOptions: {
        editor: 'codeNodeEditor',
        editorLanguage: 'javaScript',
        rows: 10,
      },
      default: '// Code runs once for each item\n// Access current item using $input.item\n// Return a single item\n\nconst item = $input.item;\n\nreturn {\n  json: {\n    ...item.json,\n    // Add your transformations here\n    myNewField: \'hello world\'\n  }\n};',
      description: 'JavaScript code to execute',
      displayOptions: {
        show: {
          mode: ['runOnceForEachItem'],
        },
      },
    },
  ],

  hints: [
    {
      message: 'Available variables: $input, $json, $binary, $item, $items, $now, $today, $workflow, $execution',
      type: 'info',
      location: 'ndv',
    },
    {
      message: 'Use console.log() for debugging - output will appear in execution logs',
      type: 'info',
      location: 'ndv',
    },
  ],
};
