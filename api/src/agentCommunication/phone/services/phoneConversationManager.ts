import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { findOrCreateConversation } from '../../../contacts/utilities/conversationUtil';

export interface PhoneConversationRequest {
  tenantId: string;
  contactId: string;
  agentId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  callSid: string;
  // conversationId removed - always finds or creates unified conversation internally (just like SMS)
}

export interface PhoneMessageRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  callSid: string;
  messageType: 'call_initiated' | 'call_completed' | 'call_failed';
  agentId?: string;
  duration?: number;
  callSummary?: string;
  transcript?: any[];
  audioUrl?: string;
}

export interface PhoneConversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  // channel: REMOVED - unified conversation for all channels
  status: 'open' | 'closed';
  assigned_user_id?: string;
  last_message_at: FirebaseFirestore.Timestamp;
  created_at: FirebaseFirestore.Timestamp;
  unread_count: number;
  last_read_at?: FirebaseFirestore.Timestamp;
}

export interface PhoneMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string; // Call SID
  from_norm: string;
  to_norm: string;
  body: string; // Human readable call status/summary
  channel: 'PHONE';
  call_sid: string;
  message_type: 'call_initiated' | 'call_completed' | 'call_failed';
  message_category?: 'system' | 'agent_report' | 'standard'; // NEW: Category for UI rendering
  call_duration?: number;
  audio_url?: string;
  transcript?: any[];
  status: string;
  created_at: FirebaseFirestore.Timestamp;
  agent_id?: string;
}

export class PhoneConversationManager {
  private normalizePhoneNumber(phoneNumber: string): string {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
  }

  private getCallStatusMessage(messageType: 'call_initiated' | 'call_completed' | 'call_failed', direction: 'inbound' | 'outbound', duration?: number): string {
    switch (messageType) {
      case 'call_initiated':
        return direction === 'inbound' ? '📞 Incoming call started' : '📞 Outbound call started';
      case 'call_completed':
        const durationText = duration ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})` : '';
        return direction === 'inbound' ? `📞 Call completed${durationText}` : `📞 Outbound call completed${durationText}`;
      case 'call_failed':
        return direction === 'inbound' ? '📞 Incoming call failed' : '📞 Outbound call failed';
      default:
        return '📞 Phone call';
    }
  }

  async findOrCreateConversation(tenantId: string, contactId: string): Promise<string> {
    // Use shared utility for unified conversation resolution
    return findOrCreateConversation(tenantId, contactId);
  }

  async addPhoneMessage(request: PhoneMessageRequest): Promise<void> {
    console.log(`📞 Adding phone message to conversation ${request.conversationId}`);

    try {
      // Check if message already exists (idempotency)
      const existingMessageQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .where('call_sid', '==', request.callSid)
        .where('message_type', '==', request.messageType)
        .limit(1)
        .get();

      if (!existingMessageQuery.empty) {
        console.log(`📞 Phone message already exists for call ${request.callSid} (${request.messageType}), skipping...`);
        return;
      }

      // Generate unique message ID
      const messageId = `${request.callSid}_${request.messageType}`;

      // Determine message category based on type and content
      let messageCategory: 'system' | 'agent_report' | 'standard' = 'system';

      if (request.messageType === 'call_completed' && request.callSummary) {
        // Call completed with AI summary = Agent Report
        messageCategory = 'agent_report';
      } else if (request.messageType === 'call_initiated' || request.messageType === 'call_failed') {
        // Simple status updates = System messages
        messageCategory = 'system';
      } else if (request.messageType === 'call_completed' && !request.callSummary) {
        // Call completed without summary = System message
        messageCategory = 'system';
      }

      console.log(`📋 Message category: ${messageCategory}`);

      // Create phone message document
      const messageRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .doc(messageId);

      const messageData: PhoneMessage = {
        id: messageId,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: request.direction,
        provider_msg_id: request.callSid,
        from_norm: request.direction === 'inbound'
          ? this.normalizePhoneNumber(request.phoneNumber)
          : 'Agent', // For outbound, agent is calling
        to_norm: request.direction === 'inbound'
          ? 'Agent' // For inbound, agent receives
          : this.normalizePhoneNumber(request.phoneNumber),
        body: request.callSummary || this.getCallStatusMessage(request.messageType, request.direction, request.duration),
        channel: 'PHONE',
        call_sid: request.callSid,
        message_type: request.messageType,
        message_category: messageCategory, // NEW: Set the category
        call_duration: request.duration,
        audio_url: request.audioUrl,
        transcript: request.transcript,
        status: request.messageType === 'call_completed' ? 'completed' :
               request.messageType === 'call_failed' ? 'failed' : 'initiated',
        created_at: admin.firestore.Timestamp.now(),
        agent_id: request.agentId
      };

      // Use batch to update both message and conversation
      const batch = firestore.batch();
      
      // Add the message
      batch.set(messageRef, messageData);

      // Update conversation metadata
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      const conversationUpdate: any = {
        last_message_at: admin.firestore.Timestamp.now()
      };

      // Only increment unread count for inbound calls
      if (request.direction === 'inbound' && request.messageType === 'call_initiated') {
        conversationUpdate.unread_count = admin.firestore.FieldValue.increment(1);
      }

      batch.update(conversationRef, conversationUpdate);

      await batch.commit();

      console.log(`📞 Successfully added phone message ${messageId} to conversation ${request.conversationId}`);

    } catch (error) {
      console.error(`❌ Error adding phone message to conversation:`, error);
      throw new Error(`Failed to add phone message to conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCallInitiatedMessage(request: PhoneConversationRequest): Promise<string> {
    console.log(`📞 Creating call initiated message`);

    try {
      // Find or create UNIFIED conversation (just like SMS)
      // This returns the ACTUAL conversation ID (clean UUID)
      const actualConversationId = await this.findOrCreateConversation(
        request.tenantId,
        request.contactId
      );

      console.log(`📞 Using UNIFIED conversation ID: ${actualConversationId}`);

      // Add call initiated message
      await this.addPhoneMessage({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: actualConversationId,
        direction: request.direction,
        phoneNumber: request.phoneNumber,
        callSid: request.callSid,
        messageType: 'call_initiated',
        agentId: request.agentId
      });

      console.log(`📞 Successfully created call initiated message for conversation ${actualConversationId}`);
      return actualConversationId;

    } catch (error) {
      console.error(`❌ Error creating call initiated message:`, error);
      throw new Error(`Failed to create call initiated message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCallCompletedMessage(request: PhoneConversationRequest & {
    duration?: number;
    callSummary?: string;
    transcript?: any[];
    audioUrl?: string;
  }): Promise<void> {
    console.log(`📞 Creating call completed message`);

    try {
      // Find or create UNIFIED conversation (just like SMS)
      // This returns the ACTUAL conversation ID (clean UUID)
      const actualConversationId = await this.findOrCreateConversation(
        request.tenantId,
        request.contactId
      );

      console.log(`📞 Using UNIFIED conversation ID: ${actualConversationId}`);

      // Add call completed message
      await this.addPhoneMessage({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: actualConversationId,
        direction: request.direction,
        phoneNumber: request.phoneNumber,
        callSid: request.callSid,
        messageType: 'call_completed',
        agentId: request.agentId,
        duration: request.duration,
        callSummary: request.callSummary,
        transcript: request.transcript,
        audioUrl: request.audioUrl
      });

      // DO NOT close phone conversations - keep them open for unified conversation system
      // Conversations remain open to show in the CRM interface alongside SMS/Email

      console.log(`✅ Successfully created call completed message for conversation ${actualConversationId}`);

    } catch (error) {
      console.error(`❌ Error creating call completed message:`, error);
      throw new Error(`Failed to create call completed message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async closeConversation(tenantId: string, contactId: string, conversationId: string): Promise<void> {
    console.log(`📞 Closing phone conversation ${conversationId}`);

    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        status: 'closed',
        last_message_at: admin.firestore.Timestamp.now()
      });

      console.log(`📞 Successfully closed conversation ${conversationId}`);

    } catch (error) {
      console.error(`❌ Error closing conversation:`, error);
      throw new Error(`Failed to close conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markConversationAsRead(tenantId: string, contactId: string, conversationId: string): Promise<void> {
    console.log(`📖 Marking phone conversation ${conversationId} as read`);

    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        unread_count: 0,
        last_read_at: admin.firestore.Timestamp.now()
      });

      console.log(`📖 Successfully marked phone conversation ${conversationId} as read`);

    } catch (error) {
      console.error(`❌ Error marking phone conversation as read:`, error);
      throw new Error(`Failed to mark phone conversation as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const phoneConversationManager = new PhoneConversationManager();