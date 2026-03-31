import { authenticateMailgunInbound } from './handleGlobalEmailInbound/authenticateMailgunInbound';
import { decipherMailgunAlias } from './handleGlobalEmailInbound/tools/decipherMailgunAlias';
import { saveEmailFirestore } from './handleGlobalEmailInbound/saveEmailFirestore';
import { EmailAttachment, emailAttachmentService, AttachmentUploadResult } from './emailAttachmentService';
import { processEmailHtmlService } from './processEmailHtml';
import { findOrCreateConversation } from '../../../../contacts/utilities/conversationUtil';

/**
 * Mailgun inbound webhook payload interface
 * Based on Mailgun's webhook format for inbound emails
 *
 * Note: Attachments come as separate file uploads in Express req.files
 */
export interface MailgunInboundPayload {
  // Authentication fields
  timestamp: string;
  token: string;
  signature: string;

  // Email metadata
  recipient: string; // Our alias email (to decipher)
  sender: string; // Original sender
  from: string; // From header
  subject: string;

  // Body content
  'body-plain': string; // Plain text body
  'body-html'?: string; // HTML body
  'stripped-text'?: string; // Body without quoted replies (preferred)
  'stripped-html'?: string; // HTML without quoted replies
  'stripped-signature'?: string; // Stripped signature

  // Headers and metadata
  'message-headers'?: string; // JSON string of email headers
  'Message-Id'?: string; // Email message ID
  'In-Reply-To'?: string; // For threading
  'References'?: string; // For threading

  // Attachments metadata
  'attachment-count'?: string; // Number of attachments
  'content-id-map'?: string; // JSON mapping CID to attachment filenames

  // Other fields
  domain?: string;

  // NEW: Attachments (populated from Express req.files)
  attachments?: EmailAttachment[];
}

/**
 * Main handler for global inbound email webhooks from Mailgun
 *
 * Flow:
 * 1. Authenticate the webhook (verify signature)
 * 2. Decipher the alias (extract tenantId/contactId from recipient)
 * 3. Validate we have required data
 * 4. Save the inbound email to Firestore
 *
 * Pattern matches SMS inbound (newRequestHandler.ts)
 *
 * @param payload - Mailgun webhook payload
 */
export async function handleGlobalEmailInbound(payload: MailgunInboundPayload): Promise<void> {
  console.log('[EMAIL INBOUND] Starting global email inbound processing...');

  try {
    // Step 1: Authenticate the webhook
    console.log('[EMAIL INBOUND] Step 1: Authenticating Mailgun webhook...');
    const isAuthenticated = authenticateMailgunInbound({
      timestamp: payload.timestamp,
      token: payload.token,
      signature: payload.signature
    });

    if (!isAuthenticated) {
      throw new Error('Invalid Mailgun webhook signature - authentication failed');
    }

    console.log('[EMAIL INBOUND] Step 1 complete: Webhook authenticated');

    // Step 2: Decipher the alias to get tenantId and contactId
    console.log('[EMAIL INBOUND] Step 2: Deciphering Mailgun alias...');
    const aliasResolution = decipherMailgunAlias(payload.recipient);

    if (!aliasResolution.valid) {
      throw new Error(`Failed to decipher alias: ${payload.recipient}`);
    }

    const { tenantId, contactId, conversationId } = aliasResolution;
    console.log(`[EMAIL INBOUND] Step 2 complete: Alias deciphered - Tenant: ${tenantId}, Contact: ${contactId}`);

    // Step 3: Validate we have required data
    console.log('[EMAIL INBOUND] Step 3: Validating required data...');
    if (!tenantId || !contactId) {
      throw new Error('Missing tenantId or contactId from alias resolution');
    }

    if (!payload.sender) {
      throw new Error('Missing sender email in webhook payload');
    }

    console.log('[EMAIL INBOUND] Step 3 complete: All required data present');

    // Step 4: Extract message ID from headers or generate one
    // Mailgun typically provides Message-Id in the headers
    const messageId = extractMessageId(payload);
    console.log(`[EMAIL INBOUND] Using message ID: ${messageId}`);

    // Step 5: Process attachments if present
    console.log('[EMAIL INBOUND] Step 5: Processing attachments...');
    let uploadedAttachments: AttachmentUploadResult[] = [];

    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`[EMAIL INBOUND] Found ${payload.attachments.length} attachment(s) to process`);

      // Resolve conversation ID before processing attachments (needed for storage path)
      const resolvedConversationId = conversationId || await findOrCreateConversation(tenantId, contactId);

      // Process each attachment
      for (let i = 0; i < payload.attachments.length; i++) {
        try {
          const attachment = payload.attachments[i];
          const uploadResult = await emailAttachmentService.processAndStoreAttachment(
            attachment,
            tenantId,
            contactId,
            resolvedConversationId,
            messageId,
            i
          );
          uploadedAttachments.push(uploadResult);
        } catch (error) {
          console.error(`[EMAIL INBOUND] Failed to process attachment ${i}:`, error);
          // Continue processing other attachments even if one fails
        }
      }

      console.log(`[EMAIL INBOUND] Successfully processed ${uploadedAttachments.length}/${payload.attachments.length} attachment(s)`);
    } else {
      console.log('[EMAIL INBOUND] No attachments to process');
    }

    // Step 6: Process HTML content (replace CIDs and store in Storage)
    console.log('[EMAIL INBOUND] Step 6: Processing HTML content...');
    let htmlStorageUrl: string | undefined;
    let htmlStoragePath: string | undefined;

    const htmlContent = payload['stripped-html'] || payload['body-html'];
    if (htmlContent) {
      try {
        // Parse content-id-map for inline image references
        const contentIdMap = processEmailHtmlService.parseContentIdMap(payload['content-id-map']);

        // Resolve conversation ID if not already done
        const resolvedConversationId = conversationId || await findOrCreateConversation(tenantId, contactId);

        // Process and store HTML
        const htmlResult = await processEmailHtmlService.processAndStoreHtml(
          htmlContent,
          contentIdMap,
          uploadedAttachments,
          tenantId,
          contactId,
          resolvedConversationId,
          messageId
        );

        if (htmlResult) {
          htmlStorageUrl = htmlResult.htmlStorageUrl;
          htmlStoragePath = htmlResult.htmlStoragePath;
          console.log('[EMAIL INBOUND] HTML processed and stored successfully');
        }
      } catch (error) {
        console.error('[EMAIL INBOUND] Failed to process HTML:', error);
        // Continue even if HTML processing fails
      }
    } else {
      console.log('[EMAIL INBOUND] No HTML content to process');
    }

    // Step 7: Save the inbound email to Firestore
    console.log('[EMAIL INBOUND] Step 7: Saving inbound email to Firestore...');
    await saveEmailFirestore({
      tenantId,
      contactId,
      conversationId: conversationId || undefined,
      messageId,
      fromEmail: payload.sender,
      toEmail: payload.recipient,
      subject: payload.subject,
      bodyPlain: payload['body-plain'],
      bodyHtml: payload['body-html'],
      strippedText: payload['stripped-text'],
      strippedHtml: payload['stripped-html'],
      threadId: payload['In-Reply-To'] || payload['References'],
      htmlStorageUrl,
      htmlStoragePath,
      attachments: uploadedAttachments
    });

    console.log('[EMAIL INBOUND] Step 7 complete: Email saved to Firestore');
    console.log('[EMAIL INBOUND] Successfully processed inbound email');

  } catch (error) {
    console.error('[EMAIL INBOUND] Error in global email inbound handler:', error);
    throw error;
  }
}

/**
 * Extracts or generates a unique message ID for the email
 * Prefers Mailgun's Message-Id, falls back to generating from timestamp + sender
 */
function extractMessageId(payload: MailgunInboundPayload): string {
  // Try to use Message-Id from headers
  if (payload['Message-Id']) {
    // Remove < and > from message ID if present
    return payload['Message-Id'].replace(/[<>]/g, '');
  }

  // Try to extract from message-headers JSON
  if (payload['message-headers']) {
    try {
      const headers = JSON.parse(payload['message-headers']);
      const messageIdHeader = headers.find((h: any[]) => h[0] === 'Message-Id');
      if (messageIdHeader && messageIdHeader[1]) {
        return messageIdHeader[1].replace(/[<>]/g, '');
      }
    } catch (e) {
      console.warn('Failed to parse message-headers:', e);
    }
  }

  // Fallback: generate a unique ID from timestamp + token
  // This ensures uniqueness even if Message-Id is missing
  return `mailgun_${payload.timestamp}_${payload.token}`;
}
