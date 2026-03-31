import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';

interface SaveEmailMessageRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageId: string; // Gmail message ID
  fromEmail: string;
  toEmail: string;
  subject: string;
  messageBody: string; // Plain text content
  htmlContent?: string; // HTML content for rich emails
  direction: 'outbound'; // Always outbound for sent messages
  threadId?: string;
}

interface EmailMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  subject: string; // Email subject
  body: string; // Plain text content
  html_content?: string; // HTML content for rich emails
  channel: 'EMAIL'; // New field to distinguish from SMS
  thread_id?: string; // Gmail thread ID for conversation threading
  status: string;
  created_at: FirebaseFirestore.Timestamp;
}

class SaveEmailToFirestoreConvo {
  private normalizeEmail(email: string): string {
    // Convert email to lowercase for consistent storage
    return email.toLowerCase().trim();
  }

  async saveOutboundMessage(request: SaveEmailMessageRequest): Promise<void> {
    try {
      console.log(`Saving outbound email to conversation ${request.conversationId}`);

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
        console.log(`Email message ${request.messageId} already exists, skipping...`);
        return;
      }

      // Create message document using Gmail message ID as document ID
      const messageRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .doc(request.messageId);

      const messageData: EmailMessage = {
        id: request.messageId,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: 'outbound', // This is an outbound message
        provider_msg_id: request.messageId,
        from_norm: this.normalizeEmail(request.fromEmail),
        to_norm: this.normalizeEmail(request.toEmail),
        subject: request.subject,
        body: request.messageBody,
        html_content: request.htmlContent, // Store HTML content
        channel: 'EMAIL', // Identify this as an email message
        thread_id: request.threadId,
        status: 'sent', // Initial status for outbound emails
        created_at: admin.firestore.Timestamp.now()
      };

      // Use batch to update both message and conversation
      const batch = firestore.batch();
      
      // Add the message
      batch.set(messageRef, messageData);

      // Update conversation's last_message_at and set channel to EMAIL if not already set
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      // Get current conversation to check channel
      const conversationDoc = await conversationRef.get();
      const conversationData = conversationDoc.data();

      const conversationUpdate: any = {
        last_message_at: admin.firestore.Timestamp.now()
      };

      // If conversation doesn't have a channel set or is SMS, update to handle multiple channels
      if (!conversationData?.channel) {
        conversationUpdate.channel = 'EMAIL';
      }

      batch.update(conversationRef, conversationUpdate);

      await batch.commit();

      console.log(`Successfully saved outbound email ${request.messageId} to conversation ${request.conversationId}`);

    } catch (error) {
      console.error(`Error saving outbound email to conversation:`, error);
      throw new Error(`Failed to save email to conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMessageStatus(
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageId: string,
    status: string
  ): Promise<void> {
    try {
      console.log(`Updating email message ${messageId} status to ${status}`);

      const messageRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(messageId);

      await messageRef.update({
        status: status,
        updated_at: admin.firestore.Timestamp.now()
      });

      console.log(`Successfully updated email message ${messageId} status to ${status}`);

    } catch (error) {
      console.error(`Error updating email message status:`, error);
      throw new Error(`Failed to update email message status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to save inbound emails (for future use when handling email webhooks)
  async saveInboundMessage(request: Omit<SaveEmailMessageRequest, 'direction'> & { direction: 'inbound' }): Promise<void> {
    try {
      console.log(`Saving inbound email to conversation ${request.conversationId}`);

      const messageRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages')
        .doc(request.messageId);

      const messageData: EmailMessage = {
        id: request.messageId,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: 'inbound',
        provider_msg_id: request.messageId,
        from_norm: this.normalizeEmail(request.fromEmail),
        to_norm: this.normalizeEmail(request.toEmail),
        subject: request.subject,
        body: request.messageBody,
        html_content: request.htmlContent, // Store HTML content for inbound emails too
        channel: 'EMAIL',
        thread_id: request.threadId,
        status: 'received',
        created_at: admin.firestore.Timestamp.now()
      };

      await messageRef.set(messageData);

      // Update conversation's last_message_at
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      await conversationRef.update({
        last_message_at: admin.firestore.Timestamp.now()
      });

      console.log(`Successfully saved inbound email ${request.messageId}`);

    } catch (error) {
      console.error('Error saving inbound email:', error);
      throw error;
    }
  }
}

export const saveEmailToFirestoreConvo = new SaveEmailToFirestoreConvo();