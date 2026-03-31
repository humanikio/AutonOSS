import { firestore } from '../../../../../config/firebase';
import admin from 'firebase-admin';
import { findOrCreateConversation } from '../../../../../contacts/utilities/conversationUtil';
import { AttachmentUploadResult } from '../emailAttachmentService';

export interface SaveInboundEmailRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string; // Optional - will be resolved if not provided
  messageId: string; // Mailgun message ID
  fromEmail: string; // Sender's email
  toEmail: string; // Our alias email
  subject: string;
  bodyPlain: string; // Plain text body
  bodyHtml?: string; // HTML body
  strippedText?: string; // Body without quoted replies (preferred)
  strippedHtml?: string; // HTML without quoted replies
  threadId?: string; // For email threading
  // NEW: Attachment and HTML storage fields
  htmlStorageUrl?: string; // Firebase Storage URL for processed HTML
  htmlStoragePath?: string; // Storage path for HTML
  attachments?: AttachmentUploadResult[]; // Processed attachments
}

interface EmailMessage {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  subject: string;
  body: string;
  html_content?: string; // DEPRECATED: Keeping for backward compatibility
  html_storage_url?: string; // NEW: URL to HTML in Firebase Storage
  html_storage_path?: string; // NEW: Storage path for HTML
  channel: 'EMAIL';
  thread_id?: string;
  media?: Array<{ // NEW: Non-inline attachments
    url: string;
    type: string;
    filename?: string;
    isInline: boolean;
  }>;
  status: string;
  created_at: FirebaseFirestore.Timestamp;
}

/**
 * Saves an inbound email to Firestore
 *
 * Pattern matches SMS inbound (manageConversation.ts):
 * 1. Find or create unified conversation (no channel filter)
 * 2. Check for idempotency (prevent duplicate messages)
 * 3. Save message with direction='inbound', channel='EMAIL'
 * 4. Update conversation metadata (last_message_at, unread_count)
 *
 * @param request - Inbound email data from Mailgun webhook
 */
export async function saveEmailFirestore(request: SaveInboundEmailRequest): Promise<void> {
  try {
    console.log(`=� Saving inbound email to Firestore for tenant ${request.tenantId}, contact ${request.contactId}`);

    // Step 1: Find or create unified conversation (same as SMS)
    const conversationId = request.conversationId || await findOrCreateConversation(
      request.tenantId,
      request.contactId
    );

    console.log(`=� Using conversation: ${conversationId}`);

    // Step 2: Check if message already exists (idempotency)
    const existingMessageQuery = await firestore
      .collection('tenants')
      .doc(request.tenantId)
      .collection('contacts')
      .doc(request.contactId)
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('provider_msg_id', '==', request.messageId)
      .limit(1)
      .get();

    if (!existingMessageQuery.empty) {
      console.log(`� Message ${request.messageId} already exists, skipping...`);
      return;
    }

    // Step 3: Normalize emails (lowercase)
    const fromNorm = normalizeEmail(request.fromEmail);
    const toNorm = normalizeEmail(request.toEmail);

    // Use stripped text/html if available (removes quoted replies), otherwise use full body
    const bodyText = request.strippedText || request.bodyPlain;
    const bodyHtml = request.strippedHtml || request.bodyHtml;

    // Step 4: Create message document
    const messageRef = firestore
      .collection('tenants')
      .doc(request.tenantId)
      .collection('contacts')
      .doc(request.contactId)
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .doc(request.messageId);

    // Build media array from attachments (non-inline only, for display as attachments)
    const mediaArray = request.attachments
      ?.filter(att => !att.isInline) // Only non-inline attachments
      .map(att => ({
        url: att.firebaseUrl,
        type: att.contentType,
        filename: att.filename,
        isInline: att.isInline
      }));

    const messageData: EmailMessage = {
      id: request.messageId,
      tenant_id: request.tenantId,
      conversation_id: conversationId,
      direction: 'inbound', // INBOUND (contact's reply)
      provider_msg_id: request.messageId,
      from_norm: fromNorm,
      to_norm: toNorm,
      subject: request.subject,
      body: bodyText,
      html_content: bodyHtml, // Keep for backward compatibility (deprecated)
      html_storage_url: request.htmlStorageUrl, // NEW: URL to HTML in Storage
      html_storage_path: request.htmlStoragePath, // NEW: Path in Storage
      channel: 'EMAIL', // Channel identifier
      thread_id: request.threadId,
      media: mediaArray && mediaArray.length > 0 ? mediaArray : undefined, // NEW: Attachments
      status: 'received', // Status for inbound emails
      created_at: admin.firestore.Timestamp.now()
    };

    // Use batch to update both message and conversation atomically
    const batch = firestore.batch();

    // Add the message
    batch.set(messageRef, messageData);

    // Step 5: Update conversation metadata
    const conversationRef = firestore
      .collection('tenants')
      .doc(request.tenantId)
      .collection('contacts')
      .doc(request.contactId)
      .collection('conversations')
      .doc(conversationId);

    batch.update(conversationRef, {
      last_message_at: admin.firestore.Timestamp.now(),
      unread_count: admin.firestore.FieldValue.increment(1) // Increment unread count
    });

    await batch.commit();

    console.log(` Successfully saved inbound email ${request.messageId} to conversation ${conversationId}`);

  } catch (error) {
    console.error(`L Error saving inbound email to Firestore:`, error);
    throw new Error(`Failed to save inbound email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to normalize email addresses (lowercase, trim)
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
