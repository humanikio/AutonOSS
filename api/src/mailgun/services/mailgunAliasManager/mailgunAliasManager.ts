import { generateMailgunAlias, GenerateAliasParams } from './generateMailgunAlias';
import { resolveMailgunAlias, AliasResolution } from './resolveMailgunAlias';

/**
 * Service for managing Mailgun email aliases
 * Provides both generation and resolution of aliases for tenant/contact tracking
 */
export const mailgunAliasManager = {
  /**
   * Generates a unique Mailgun alias for a tenant/contact/conversation
   *
   * @param params - Object containing tenantId (required), contactId (required), conversationId (optional)
   * @returns Encoded email alias (e.g., "encoded.hash@mail.example.com")
   * @throws Error if tenantId or contactId is missing
   */
  generateAlias(params: GenerateAliasParams): string {
    // Validate required parameters
    if (!params.tenantId) {
      throw new Error('tenantId is required to generate Mailgun alias');
    }
    if (!params.contactId) {
      throw new Error('contactId is required to generate Mailgun alias');
    }

    // Generate and return the alias
    return generateMailgunAlias(params);
  },

  /**
   * Resolves a Mailgun alias back to its component parts
   * Verifies authenticity via HMAC hash
   *
   * @param alias - The full email alias to resolve
   * @returns Object containing tenantId, contactId, conversationId, and validity flag
   */
  resolveAlias(alias: string): AliasResolution {
    if (!alias || typeof alias !== 'string') {
      return {
        tenantId: '',
        contactId: '',
        conversationId: null,
        valid: false
      };
    }

    return resolveMailgunAlias(alias);
  }
};
