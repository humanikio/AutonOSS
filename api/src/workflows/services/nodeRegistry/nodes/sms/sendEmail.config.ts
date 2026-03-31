/**
 * Pulseline Send Email Node Configuration
 * Sends an email message to a contact
 */

import { INodeTypeDescription } from '../../types';

export const pulselineSendEmailNode: INodeTypeDescription = {
  displayName: 'Send Email',
  name: 'pulselineSendEmail',
  icon: 'fa:envelope-open-text',
  group: ['communication'],
  version: 1,
  description: 'Send an email message to a contact. ConversationId is auto-resolved from contactId.',
  keywords: ['mail', 'message', 'notification', 'outbound', 'gmail', 'template'],
  subtitle: '={{$parameter["subject"]}}',

  defaults: {
    name: 'Send Email',
    color: '#3B82F6',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'email_send',
    apiEndpoint: '/api/email/send',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the email was sent successfully', required: true },
        { name: 'messageId', type: 'string', description: 'ID of the sent message', required: true },
        { name: 'threadId', type: 'string', description: 'Email thread ID' },
        { name: 'message', type: 'string', description: 'Success message' },
      ],
    },
    loadOptionsMethods: {
      getEmailAccounts: {
        endpoint: '/api/email/accounts',
        method: 'GET',
        responseMapping: {
          valueField: 'id',
          labelField: 'email',
          dataPath: 'emailAccounts',
        },
      },
      getEmailTemplates: {
        endpoint: '/api/email-templates?status=published',
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
      displayName: 'Contact ID',
      name: 'contactId',
      type: 'string',
      default: '{{$contact.contactId}}',
      required: true,
      placeholder: '{{$contact.contactId}}',
      description: 'ID of the contact to send email to',
    },
    {
      displayName: 'Email Account',
      name: 'emailAccountId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getEmailAccounts',
      },
      default: '',
      required: true,
      description: 'The connected email account to send from',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Content Type',
      name: 'contentType',
      type: 'options',
      options: [
        {
          name: 'Manual Message',
          value: 'manual',
        },
        {
          name: 'Use Template',
          value: 'template',
        },
      ],
      default: 'manual',
      required: true,
      description: 'Choose whether to write a manual message or use a template',
    },
    {
      displayName: 'Email Template',
      name: 'templateId',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getEmailTemplates',
      },
      default: '',
      required: true,
      description: 'Select an email template to send',
      displayOptions: {
        show: {
          contentType: ['template'],
        },
      },
      options: [],
    },
    {
      displayName: 'To Email Address',
      name: 'to',
      type: 'string',
      default: '{{$contact.email}}',
      required: true,
      placeholder: '{{$contact.email}}',
      description: 'The recipient email address',
    },
    {
      displayName: 'Subject',
      name: 'subject',
      type: 'string',
      default: '',
      required: true,
      placeholder: 'Email subject...',
      description: 'The email subject line',
    },
    {
      displayName: 'Message',
      name: 'message',
      type: 'string',
      typeOptions: {
        rows: 6,
      },
      default: '',
      required: false,
      placeholder: 'Your email message here...',
      description: 'The email message content (required when not using template)',
      displayOptions: {
        show: {
          contentType: ['manual'],
        },
      },
    },
  ],
};
