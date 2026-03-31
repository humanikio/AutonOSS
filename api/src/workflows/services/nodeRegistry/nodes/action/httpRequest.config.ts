/**
 * HTTP Request Action Node Configuration
 * Based on n8n's HttpRequest node: packages/nodes-base/nodes/HttpRequest/
 */

import { INodeTypeDescription } from '../../types';

export const httpRequestNode: INodeTypeDescription = {
  displayName: 'HTTP Request',
  name: 'httpRequest',
  icon: { light: 'file:httprequest.svg', dark: 'file:httprequest.dark.svg' },
  group: ['integrations'],
  version: [1, 2, 3, 4],
  defaultVersion: 4,
  description: 'Makes an HTTP request and returns the response data',
  keywords: ['api', 'fetch', 'rest', 'call', 'external', 'get', 'post', 'webhook'],
  subtitle: '={{$parameter["method"] + ": " + $parameter["url"]}}',

  defaults: {
    name: 'HTTP Request',
    color: '#0000FF',
  },

  inputs: ['main'],
  outputs: ['main'],

  properties: [
    {
      displayName: 'Method',
      name: 'method',
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
      description: 'The request method to use',
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      default: '',
      placeholder: 'https://api.example.com/endpoint',
      required: true,
      description: 'The URL to make the request to',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'options',
      options: [
        {
          name: 'None',
          value: 'none',
        },
        {
          name: 'Basic Auth',
          value: 'basicAuth',
        },
        {
          name: 'Bearer Token',
          value: 'bearerToken',
        },
        {
          name: 'Header Auth',
          value: 'headerAuth',
        },
        {
          name: 'OAuth2',
          value: 'oAuth2',
        },
      ],
      default: 'none',
      description: 'The way to authenticate',
    },
    {
      displayName: 'Send Query Parameters',
      name: 'sendQuery',
      type: 'boolean',
      default: false,
      description: 'Whether the request has query params or not',
    },
    {
      displayName: 'Query Parameters',
      name: 'queryParameters',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      placeholder: 'Add Parameter',
      default: {},
      displayOptions: {
        show: {
          sendQuery: [true],
        },
      },
      options: [
        {
          name: 'parameter',
          displayName: 'Parameter',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              default: '',
              description: 'Name of the query parameter',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'Value of the query parameter',
            },
          ],
        },
      ],
      description: 'Query parameters to send',
    },
    {
      displayName: 'Send Headers',
      name: 'sendHeaders',
      type: 'boolean',
      default: false,
      description: 'Whether the request has headers or not',
    },
    {
      displayName: 'Header Parameters',
      name: 'headerParameters',
      type: 'fixedCollection',
      typeOptions: {
        multipleValues: true,
      },
      placeholder: 'Add Header',
      default: {},
      displayOptions: {
        show: {
          sendHeaders: [true],
        },
      },
      options: [
        {
          name: 'parameter',
          displayName: 'Header',
          values: [
            {
              displayName: 'Name',
              name: 'name',
              type: 'string',
              default: '',
              description: 'Name of the header',
            },
            {
              displayName: 'Value',
              name: 'value',
              type: 'string',
              default: '',
              description: 'Value of the header',
            },
          ],
        },
      ],
      description: 'Header parameters to send',
    },
    {
      displayName: 'Send Body',
      name: 'sendBody',
      type: 'boolean',
      default: false,
      displayOptions: {
        show: {
          method: ['POST', 'PUT', 'PATCH'],
        },
      },
      description: 'Whether the request has a body or not',
    },
    {
      displayName: 'Body Content Type',
      name: 'contentType',
      type: 'options',
      displayOptions: {
        show: {
          sendBody: [true],
        },
      },
      options: [
        {
          name: 'JSON',
          value: 'json',
        },
        {
          name: 'Form-Data Multipart',
          value: 'multipart-form-data',
        },
        {
          name: 'Form Urlencoded',
          value: 'form-urlencoded',
        },
        {
          name: 'Raw',
          value: 'raw',
        },
      ],
      default: 'json',
      description: 'Content-Type to use for the body',
    },
    {
      displayName: 'Body Parameters',
      name: 'bodyParameters',
      type: 'json',
      displayOptions: {
        show: {
          sendBody: [true],
          contentType: ['json'],
        },
      },
      default: '{\n  \n}',
      description: 'Body parameters as JSON',
    },
    {
      displayName: 'Options',
      name: 'options',
      type: 'collection',
      placeholder: 'Add Option',
      default: {},
      options: [
        {
          displayName: 'Ignore SSL Issues',
          name: 'allowUnauthorizedCerts',
          type: 'boolean',
          default: false,
          description: 'Whether to download the response even if SSL certificate validation is not possible',
        },
        {
          displayName: 'Response Format',
          name: 'responseFormat',
          type: 'options',
          options: [
            {
              name: 'Auto detect',
              value: 'autodetect',
            },
            {
              name: 'JSON',
              value: 'json',
            },
            {
              name: 'Text',
              value: 'text',
            },
            {
              name: 'File',
              value: 'file',
            },
          ],
          default: 'autodetect',
          description: 'The format in which the data gets returned from the URL',
        },
        {
          displayName: 'Timeout',
          name: 'timeout',
          type: 'number',
          typeOptions: {
            minValue: 1,
          },
          default: 10000,
          description: 'Time in ms to wait for a response before failing the request (Max: 300000 = 5 minutes)',
        },
        {
          displayName: 'Redirect',
          name: 'redirect',
          type: 'options',
          options: [
            {
              name: 'Follow',
              value: 'follow',
              description: 'Follow redirects automatically',
            },
            {
              name: 'Error',
              value: 'error',
              description: 'Error when a redirect happens',
            },
            {
              name: 'Manual',
              value: 'manual',
              description: 'Do not follow redirects',
            },
          ],
          default: 'follow',
          description: 'How redirects should be handled',
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
      name: 'httpBearerAuth',
      required: true,
      displayOptions: {
        show: {
          authentication: ['bearerToken'],
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
    {
      name: 'oAuth2Api',
      required: true,
      displayOptions: {
        show: {
          authentication: ['oAuth2'],
        },
      },
    },
  ],
};
