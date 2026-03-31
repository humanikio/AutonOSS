import { mailgunAliasManager } from '../../../../../../mailgun/services/mailgunAliasManager/mailgunAliasManager';
import { AliasResolution } from '../../../../../../mailgun/services/mailgunAliasManager/resolveMailgunAlias';

/**
 * Deciphers a Mailgun alias from an inbound email recipient address
 *
 * This is a wrapper around the existing mailgunAliasManager.resolveAlias()
 * It extracts tenantId, contactId, and conversationId from the base64-encoded alias
 *
 * @param recipientEmail - The full recipient email address (e.g., "encoded.hash@mail.example.com")
 * @returns AliasResolution object containing tenantId, contactId, conversationId, and validity flag
 *
 * @example
 * const resolution = decipherMailgunAlias("abc123.def456@mail.example.com");
 * if (resolution.valid) {
 *   console.log(`Tenant: ${resolution.tenantId}, Contact: ${resolution.contactId}`);
 * }
 */
export function decipherMailgunAlias(recipientEmail: string): AliasResolution {
  try {
    console.log(`🔍 Deciphering Mailgun alias: ${recipientEmail}`);

    // Use the existing alias resolution service
    const resolution = mailgunAliasManager.resolveAlias(recipientEmail);

    if (resolution.valid) {
      console.log(`✅ Successfully deciphered alias - Tenant: ${resolution.tenantId}, Contact: ${resolution.contactId}, Conversation: ${resolution.conversationId || 'none'}`);
    } else {
      console.error(`❌ Failed to decipher alias: ${recipientEmail}`);
    }

    return resolution;

  } catch (error) {
    console.error('❌ Error deciphering Mailgun alias:', error);
    return {
      tenantId: '',
      contactId: '',
      conversationId: null,
      valid: false
    };
  }
}
