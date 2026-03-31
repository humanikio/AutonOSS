/**
 * Phone Call Completed Event Definition
 * Triggered when an agent phone call is completed and transcript is processed
 *
 * Trigger Point: handlePostCall.ts after transcript processing (line ~140-156)
 * Available at the point where summarizeHistoryService.summarizeConversation() is called
 */

import { TriggerEventDefinition } from '../../../types';

export const phoneCallCompletedV1: TriggerEventDefinition = {
  type: 'phone.call.completed.v1',
  version: 1,
  displayName: 'Phone Call Completed',
  description: 'Triggered when an agent phone call completes with transcript available',
  category: 'communication',

  payloadSchema: {
    type: 'object',
    properties: {
      // Core identifiers
      tenantId: { type: 'string', description: 'Tenant identifier' },
      contactId: { type: 'string', description: 'Contact identifier' },
      agentId: { type: 'string', description: 'Agent identifier' },

      // Phone/conversation IDs
      conversationId: { type: 'string', description: 'ElevenLabs conversation ID' },
      localConversationId: { type: 'string', description: 'Internal phone record ID' },
      actualConversationId: { type: 'string', description: 'Unified conversation ID' },
      phoneNumber: { type: 'string', description: 'Contact phone number' },

      // Call metadata
      direction: { type: 'string', enum: ['inbound', 'outbound'], description: 'Call direction' },
      duration: { type: 'number', description: 'Call duration in seconds' },

      // AI analysis
      callSummary: { type: 'string', description: 'AI-generated call summary from analysis' },
      transcript: { type: 'array', description: 'Array of transcript objects' },
      analysis: { type: 'object', description: 'Full ElevenLabs analysis object' },

      // Optional audio
      audioUrl: { type: 'string', description: 'Firebase Storage URL for call recording' },

      // Full metadata
      metadata: { type: 'object', description: 'Full ElevenLabs metadata object' }
    },
    required: [
      'tenantId',
      'contactId',
      'agentId',
      'conversationId',
      'actualConversationId',
      'phoneNumber',
      'direction',
      'transcript'
    ]
  },

  examplePayload: {
    tenantId: 'ten_123abc',
    contactId: 'con_456def',
    agentId: 'agent_789ghi',
    conversationId: 'conv_11labs_abc123',
    localConversationId: 'phone_01HZYX...',
    actualConversationId: 'conv_unified_xyz',
    phoneNumber: '+15551234567',
    direction: 'outbound',
    duration: 180,
    callSummary: 'Customer inquired about pricing for the premium plan. Interested in scheduling a demo.',
    transcript: [
      { role: 'agent', text: 'Hello, this is Sarah from Pulseline...', timestamp: 1699200000 },
      { role: 'user', text: 'Hi, I wanted to ask about your pricing...', timestamp: 1699200010 }
    ],
    analysis: {
      transcript_summary: 'Customer inquired about pricing...',
      call_summary_title: 'Pricing Inquiry',
      sentiment: 'positive'
    },
    audioUrl: 'https://firebasestorage.googleapis.com/v0/b/project/o/audio.mp3',
    metadata: {
      call_duration_secs: 180,
      phone_call: { direction: 'outbound' }
    }
  },

  filterableFields: [
    { field: 'direction', type: 'string', description: 'Filter by call direction (inbound/outbound)' },
    { field: 'duration', type: 'number', description: 'Filter by call duration in seconds' },
    { field: 'agentId', type: 'string', description: 'Filter by agent' },
    { field: 'contactId', type: 'string', description: 'Filter by contact' }
  ],

  isStable: true
};
