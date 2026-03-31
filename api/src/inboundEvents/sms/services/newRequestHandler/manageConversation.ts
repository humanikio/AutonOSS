import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { mediaDownloadService } from '../../../../services/mediaDownloadService';
import { v4 as uuidv4 } from 'uuid';
import { triggerContactProfileAnalysisBackground } from '../../../../universalContactMemory/conversationHistory/tools/callContactProfileAnalysis';
import { findOrCreateConversation } from '../../../../contacts/utilities/conversationUtil';

export interface MessageData {
  messageId: string; // Twilio MessageSid
  from: string;
  to: string;
  body: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  timestamp: string;
}

export interface ManageConversationRequest {
  tenantId: string;
  contactId: string;
  messageData: MessageData;
}

export interface Conversation {
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

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  body: string;
  channel: 'SMS' | 'WHATSAPP'; // Channel metadata on message
  media?: Array<{
    url: string;
    type: string;
  }>;
  status: string;
  created_at: FirebaseFirestore.Timestamp;
}

export class ConversationManager {
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

  async findOrCreateConversation(tenantId: string, contactId: string): Promise<string> {
    // Use shared utility for unified conversation resolution
    return findOrCreateConversation(tenantId, contactId);
  }

  async addMessageToConversation(request: ManageConversationRequest): Promise<void> {
    console.log(`=� Adding message to conversation for tenant ${request.tenantId}, contact ${request.contactId}`);

    try {
      // Find or create conversation
      const conversationId = await this.findOrCreateConversation(request.tenantId, request.contactId);

      // Check if message already exists (idempotency)
      const existingMessageQuery = await firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('provider_msg_id', '==', request.messageData.messageId)
        .limit(1)
        .get();

      if (!existingMessageQuery.empty) {
        console.log(`� Message ${request.messageData.messageId} already exists, skipping...`);
        return;
      }

      // SPLIT MESSAGES: Create separate messages for text and media
      console.log(`📝 Creating messages - Text: ${!!request.messageData.body}, Media count: ${request.messageData.mediaUrls?.length || 0}`);

      // Step 1: Create text message if body exists
      if (request.messageData.body && request.messageData.body.trim()) {
        await this.createTextMessage(request, conversationId);
        console.log(`✅ Created text message: ${request.messageData.messageId}`);
      }

      // Step 2: Create separate media messages
      if (request.messageData.mediaUrls && request.messageData.mediaUrls.length > 0) {
        await this.createMediaMessages(request, conversationId);
        console.log(`✅ Created ${request.messageData.mediaUrls.length} media messages`);
      }

      // If neither text nor media, create empty message (shouldn't happen but safety net)
      if (!request.messageData.body?.trim() && (!request.messageData.mediaUrls || request.messageData.mediaUrls.length === 0)) {
        console.log(`⚠️ Creating empty message as fallback for: ${request.messageData.messageId}`);
        await this.createTextMessage(request, conversationId);
      }

      // Update conversation metadata after creating messages
      await this.updateConversationMetadata(request.tenantId, request.contactId, conversationId);

      // Trigger background profile analysis after message is saved
      this.triggerProfileAnalysis(request.tenantId, request.contactId, conversationId);

      console.log(`Successfully added message ${request.messageData.messageId} to conversation ${conversationId}`);

    } catch (error) {
      console.error(`L Error adding message to conversation:`, error);
      throw new Error(`Failed to add message to conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markConversationAsRead(tenantId: string, contactId: string, conversationId: string): Promise<void> {
    console.log(`📖 Marking conversation ${conversationId} as read for contact ${contactId}`);

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

      console.log(`✅ Successfully marked conversation ${conversationId} as read`);

    } catch (error) {
      console.error(`❌ Error marking conversation as read:`, error);
      throw new Error(`Failed to mark conversation as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a text-only message
   */
  private async createTextMessage(request: ManageConversationRequest, conversationId: string): Promise<void> {
    const messageRef = firestore
      .collection('tenants')
      .doc(request.tenantId)
      .collection('contacts')
      .doc(request.contactId)
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(request.messageData.messageId);

    const messageData: Message = {
      id: request.messageData.messageId,
      tenant_id: request.tenantId,
      conversation_id: conversationId,
      direction: 'inbound',
      provider_msg_id: request.messageData.messageId,
      from_norm: this.normalizePhoneNumber(request.messageData.from),
      to_norm: this.normalizePhoneNumber(request.messageData.to),
      body: request.messageData.body || '',
      channel: 'SMS', // Channel metadata on message
      media: undefined, // Text message has no media
      status: 'received',
      created_at: admin.firestore.Timestamp.now()
    };

    await messageRef.set(messageData);
  }

  /**
   * Creates separate media-only messages for each attachment
   */
  private async createMediaMessages(request: ManageConversationRequest, conversationId: string): Promise<void> {
    if (!request.messageData.mediaUrls || !request.messageData.mediaTypes) {
      return;
    }

    // Process each media attachment
    for (let i = 0; i < request.messageData.mediaUrls.length; i++) {
      const twilioUrl = request.messageData.mediaUrls[i];
      const mediaType = request.messageData.mediaTypes[i] || 'application/octet-stream';
      
      try {
        console.log(`📥 Processing media ${i + 1}/${request.messageData.mediaUrls.length}: ${mediaType}`);

        // Generate unique message ID for this media
        const mediaMessageId = `${request.messageData.messageId}_media_${i}`;

        // Download from Twilio and upload to Firebase Storage
        const mediaResult = await mediaDownloadService.downloadAndStoreMedia(
          twilioUrl,
          request.tenantId,
          request.contactId,
          conversationId,
          mediaMessageId,
          i,
          mediaType
        );

        // Create media-only message document
        const messageRef = firestore
          .collection('tenants')
          .doc(request.tenantId)
          .collection('contacts')
          .doc(request.contactId)
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(mediaMessageId);

        const messageData: Message = {
          id: mediaMessageId,
          tenant_id: request.tenantId,
          conversation_id: conversationId,
          direction: 'inbound',
          provider_msg_id: request.messageData.messageId, // Link back to original Twilio message
          from_norm: this.normalizePhoneNumber(request.messageData.from),
          to_norm: this.normalizePhoneNumber(request.messageData.to),
          body: '', // Media message has no text body
          channel: 'SMS', // Channel metadata on message
          media: [{
            url: mediaResult.firebaseUrl,
            type: mediaResult.contentType
          }],
          status: 'received',
          created_at: admin.firestore.Timestamp.now()
        };

        await messageRef.set(messageData);
        console.log(`✅ Created media message: ${mediaMessageId} with Firebase URL`);

      } catch (error) {
        console.error(`❌ Failed to process media ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Create message with original Twilio URL as fallback
        const fallbackMessageId = `${request.messageData.messageId}_media_${i}`;
        const fallbackMessageRef = firestore
          .collection('tenants')
          .doc(request.tenantId)
          .collection('contacts')
          .doc(request.contactId)
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .doc(fallbackMessageId);

        const fallbackMessageData: Message = {
          id: fallbackMessageId,
          tenant_id: request.tenantId,
          conversation_id: conversationId,
          direction: 'inbound',
          provider_msg_id: request.messageData.messageId,
          from_norm: this.normalizePhoneNumber(request.messageData.from),
          to_norm: this.normalizePhoneNumber(request.messageData.to),
          body: '📎 Attachment (download failed)',
          channel: 'SMS', // Channel metadata on message
          media: [{
            url: twilioUrl, // Fallback to original Twilio URL
            type: mediaType
          }],
          status: 'received',
          created_at: admin.firestore.Timestamp.now()
        };

        await fallbackMessageRef.set(fallbackMessageData);
        console.log(`⚠️ Created fallback message: ${fallbackMessageId} with Twilio URL`);
      }
    }
  }

  /**
   * Updates conversation metadata after message creation
   */
  private async updateConversationMetadata(tenantId: string, contactId: string, conversationId: string): Promise<void> {
    const conversationRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('contacts')
      .doc(contactId)
      .collection('conversations')
      .doc(conversationId);

    await conversationRef.update({
      last_message_at: admin.firestore.Timestamp.now(),
      unread_count: admin.firestore.FieldValue.increment(1)
    });
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

export const conversationManager = new ConversationManager();