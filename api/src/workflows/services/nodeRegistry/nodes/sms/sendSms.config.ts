/**
 * Pulseline Send SMS Node Configuration
 * Sends an SMS message to a phone number
 */

import { INodeTypeDescription } from '../../types';

export const pulselineSendSmsNode: INodeTypeDescription = {
  displayName: 'Send SMS',
  name: 'pulselineSendSms',
  icon: 'fa:comment-dots',
  group: ['communication'],
  version: 1,
  description: 'Send an SMS message to a phone number.',
  keywords: ['text', 'message', 'twilio', 'notification', 'alert', 'outbound'],
  subtitle: '={{$parameter["message"]}}',

  defaults: {
    name: 'Send SMS',
    color: '#10B981',
  },

  inputs: ['main'],
  outputs: ['main'],

  // Custom metadata for HTTP conversion
  _pulseline: {
    isCustomNode: true,
    transformationMethod: 'sms_send',
    apiEndpoint: '/api/sms/send',
    httpMethod: 'POST',
    requiresAuth: true,
    continueOnFail: true,
    successResponse: {
      fields: [
        { name: 'success', type: 'boolean', description: 'Whether the SMS was sent successfully', required: true },
        { name: 'messageId', type: 'string', description: 'ID of the sent message', required: true },
        { name: 'message', type: 'string', description: 'Success message' },
      ],
    },
    loadOptionsMethods: {
      getPhoneNumbers: {
        endpoint: '/api/phone-numbers/purchased',
        method: 'GET',
        responseMapping: {
          valueField: 'phoneNumber',
          labelField: 'phoneNumber',
        },
      },
    },
  },

  properties: [
    {
      displayName: 'Recipient Configuration',
      name: 'recipientNotice',
      type: 'notice',
      default: '',
      description: '📋 The "To" field accepts a phone number. Use {{$contact.phoneNumber}} to reference the contact\'s phone number.',
    },
    {
      displayName: 'To (Phone Number)',
      name: 'to',
      type: 'string',
      default: '{{$contact.phoneNumber}}',
      required: true,
      placeholder: '+1234567890 or {{$contact.phoneNumber}}',
      description: 'The recipient phone number in E.164 format (e.g., +1234567890) or use {{$contact.phoneNumber}} to reference the contact\'s phone number.',
    },
    {
      displayName: 'From Phone Number',
      name: 'phoneNumber',
      type: 'options',
      typeOptions: {
        loadOptionsMethod: 'getPhoneNumbers',
      },
      default: '',
      required: true,
      description: 'Select the phone number to send from (must be a purchased Twilio number)',
      options: [], // Will be populated dynamically
    },
    {
      displayName: 'Message',
      name: 'message',
      type: 'string',
      typeOptions: {
        rows: 4,
      },
      default: '',
      required: true,
      placeholder: 'Your message here...',
      description: 'The SMS message content to send',
    },
  ],
};
