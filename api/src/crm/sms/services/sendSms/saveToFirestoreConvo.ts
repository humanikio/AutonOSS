import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { triggerContactProfileAnalysisBackground } from '../../../../universalContactMemory/conversationHistory/tools/callContactProfileAnalysis';

interface SaveMessageRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageSid: string; // Twilio message SID
  fromPhoneNumber: string;
  toPhoneNumber: string;
  messageBody: string;
  direction: 'outbound'; // Always outbound for sent messages
  agentId?: string; // Optional agent ID for agent-sent messages
  userId?: string; // Optional user ID for user-sent messages
}

interface SaveDestinationMessageRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageId: string; // Custom message ID for destination messages
  fromPhoneNumber: string;
  toPhoneNumber: string;
  messageBody: string;
  direction: 'outbound';
  agentId?: string;
  userId?: string; // Optional user ID for user-sent messages
  destinationKey: string; // The destination webhook key used
  webhookResponse?: any; // The webhook response for debugging
  statusCode?: number; // HTTP status code from webhook
}

interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  body: string;
  media?: Array<{
    url: string;
    type: string;
  }>;
  status: string;
  created_at: FirebaseFirestore.Timestamp;
  agent_id?: string; // Agent ID for agent-sent messages
  user_id?: string; // User ID for user-sent messages
  
  // Destination workflow fields
  destination_key?: string; // The destination webhook key used
  send_method?: 'traditional_sms' | 'destination_webhook'; // How the message was sent
  webhook_response?: any; // Webhook response data for destination messages
  webhook_status_code?: number; // HTTP status code from webhook
}

class SaveToFirestoreConvo {
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Handle US numbers
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }
    
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // Return as-is if it already has + or handle international numbers
    return phoneNumber.startsWith('+') ? phoneNumber : `+${digitsOnly}`;
  }

  async saveOutboundMessage(request: SaveMessageRequest): Promise<void> {
    try {
      console.log(`Saving outbound message to conversation ${request.conversationId}`);

      // Check if message already exists (idempotency check)
      const existingMessageQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .where('provider_msg_id', '==', request.messageSid)
        .limit(1)
        .get();

      if (!existingMessageQuery.empty) {
        console.log(`Message ${request.messageSid} already exists, skipping...`);
        return;
      }

      // Create message document using Twilio message SID as document ID
      const messageRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .doc(request.messageSid);

      const messageData: Message = {
        id: request.messageSid,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: 'outbound', // This is an outbound message
        provider_msg_id: request.messageSid,
        from_norm: this.normalizePhoneNumber(request.fromPhoneNumber),
        to_norm: this.normalizePhoneNumber(request.toPhoneNumber),
        body: request.messageBody,
        status: 'sent', // Initial status for outbound messages
        created_at: admin.firestore.Timestamp.now(),
        agent_id: request.agentId, // Include agent ID if provided
        user_id: request.userId, // Include user ID if provided
        send_method: 'traditional_sms' // Mark as traditional SMS
      };

      console.log(`💾 Saving message data:`, JSON.stringify({
        ...messageData,
        created_at: 'Timestamp'
      }, null, 2));

      // Use batch to update both message and conversation
      const batch = firestore.batch();
      
      // Add the message
      batch.set(messageRef, messageData);

      // Update conversation's last_message_at
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      batch.update(conversationRef, {
        last_message_at: admin.firestore.Timestamp.now()
      });

      await batch.commit();

      console.log(`Successfully saved outbound message ${request.messageSid} to conversation ${request.conversationId}`);

      // Trigger background profile analysis after message is saved
      this.triggerProfileAnalysis(request.tenantId, request.contactId, request.conversationId);

    } catch (error) {
      console.error(`Error saving outbound message to conversation:`, error);
      throw new Error(`Failed to save message to conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveDestinationMessage(request: SaveDestinationMessageRequest): Promise<void> {
    try {
      console.log(`Saving destination message to conversation ${request.conversationId}`);
      console.log(`Destination key: ${request.destinationKey}`);

      // Check if message already exists (idempotency check)
      const existingMessageQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .where('provider_msg_id', '==', request.messageId)
        .limit(1)
        .get();

      if (!existingMessageQuery.empty) {
        console.log(`Message ${request.messageId} already exists, skipping...`);
        return;
      }

      // Create message document using custom message ID
      const messageRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .doc(request.messageId);

      const messageData: Message = {
        id: request.messageId,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: 'outbound',
        provider_msg_id: request.messageId, // Use custom message ID as provider ID
        from_norm: this.normalizePhoneNumber(request.fromPhoneNumber),
        to_norm: this.normalizePhoneNumber(request.toPhoneNumber),
        body: request.messageBody,
        status: 'sent', // Status for destination webhook messages
        created_at: admin.firestore.Timestamp.now(),
        agent_id: request.agentId,
        user_id: request.userId, // Include user ID if provided
        // Destination-specific fields
        destination_key: request.destinationKey,
        send_method: 'destination_webhook',
        webhook_response: request.webhookResponse,
        webhook_status_code: request.statusCode
      };

      // Use batch to update both message and conversation
      const batch = firestore.batch();
      
      // Add the message
      batch.set(messageRef, messageData);

      // Update conversation's last_message_at
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      batch.update(conversationRef, {
        last_message_at: admin.firestore.Timestamp.now()
      });

      await batch.commit();

      console.log(`Successfully saved destination message ${request.messageId} to conversation ${request.conversationId}`);
      console.log(`Destination key: ${request.destinationKey}, Status code: ${request.statusCode}`);

      // Trigger background profile analysis after message is saved
      this.triggerProfileAnalysis(request.tenantId, request.contactId, request.conversationId);

    } catch (error) {
      console.error(`Error saving destination message to conversation:`, error);
      throw new Error(`Failed to save destination message to conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMessageStatus(
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageSid: string,
    status: string
  ): Promise<void> {
    try {
      console.log(`Updating message ${messageSid} status to ${status}`);

      const messageRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageSid);

      await messageRef.update({
        status: status,
        updated_at: admin.firestore.Timestamp.now()
      });

      console.log(`Successfully updated message ${messageSid} status to ${status}`);

    } catch (error) {
      console.error(`Error updating message status:`, error);
      throw new Error(`Failed to update message status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Triggers background contact profile analysis after message is saved
   * Pulls existing summary (if available) and recent messages
   */
  private async triggerProfileAnalysis(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<void> {
    try {
      console.log('Triggering background contact profile analysis');

      // Fetch recent messages (last 20)
      const messagesSnapshot = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('created_at', 'desc')
        .limit(20)
        .get();

      const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);

      // Fetch existing summary (if available)
      const conversationDoc = await firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId)
        .get();

      const conversationData = conversationDoc.data();
      const summary = conversationData?.summary || '';

      // Trigger background profile analysis (fire-and-forget)
      triggerContactProfileAnalysisBackground({
        tenantId,
        contactId,
        conversationSummary: summary,
        recentMessages: messages
      });

    } catch (error) {
      console.error('Error triggering profile analysis (non-blocking):', error);
      // Don't throw - this is background processing
    }
  }
}

export const saveToFirestoreConvo = new SaveToFirestoreConvo();