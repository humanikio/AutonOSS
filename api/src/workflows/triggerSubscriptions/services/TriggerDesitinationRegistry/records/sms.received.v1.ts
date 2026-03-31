/**
 * SMS Received Event Definition
 * Triggered when an inbound SMS message is received and tenant/contact are resolved
 *
 * Trigger Point: newRequestHandler.ts after tenant and contact resolution (line ~203-217)
 * Available after findOrCreateContact completes, before addMessageToConversation
 */

import { TriggerEventDefinition } from '../../../types';

export const smsReceivedV1: TriggerEventDefinition = {
  type: 'sms.received.v1',
  version: 1,
  displayName: 'SMS Received',
  description: 'Triggered when an inbound SMS message is received and processed',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      // Core identifiers
      tenantId: { type: 'string', description: 'Tenant identifier' },
      contactId: { type: 'string', description: 'Contact identifier (found or created)' },

      // Message identifiers
      messageId: { type: 'string', description: 'Twilio message ID (MessageSid)' },
      messagingServiceId: { type: 'string', description: 'Twilio Messaging Service ID' },

      // Message content
      from: { type: 'string', description: 'Sender phone number (normalized)' },
      to: { type: 'string', description: 'Recipient phone number (normalized)' },
      body: { type: 'string', description: 'Message text content' },

      // Media attachments
      mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Array of media URLs' },
      mediaTypes: { type: 'array', items: { type: 'string' }, description: 'Array of media content types' },
      mediaCount: { type: 'number', description: 'Number of media attachments' },

      // Metadata
      timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp' },
      fromCity: { type: 'string', description: 'Sender city (from Twilio)' },
      fromState: { type: 'string', description: 'Sender state (from Twilio)' },
      fromCountry: { type: 'string', description: 'Sender country (from Twilio)' },
      numSegments: { type: 'number', description: 'Number of SMS segments' }
    },
    required: ['tenantId', 'contactId', 'messageId', 'from', 'to', 'body', 'timestamp']
  },

  examplePayload: {
    tenantId: 'ten_123abc',
    contactId: 'con_456def',
    messageId: 'SM1234567890abcdef',
    messagingServiceId: 'MG9876543210',
    from: '+15551234567',
    to: '+15559876543',
    body: 'Hello! I would like more information about your services.',
    mediaUrls: [],
    mediaTypes: [],
    mediaCount: 0,
    timestamp: '2025-11-05T20:00:00Z',
    fromCity: 'San Francisco',
    fromState: 'CA',
    fromCountry: 'US',
    numSegments: 1
  },

  filterableFields: [
    { field: 'from', type: 'string', description: 'Filter by sender phone number' },
    { field: 'to', type: 'string', description: 'Filter by recipient phone number' },
    { field: 'mediaCount', type: 'number', description: 'Filter by number of media attachments' },
    { field: 'body', type: 'string', description: 'Filter by message text content (contains)' },
    { field: 'contactId', type: 'string', description: 'Filter by specific contact' }
  ],

  isStable: true
};
