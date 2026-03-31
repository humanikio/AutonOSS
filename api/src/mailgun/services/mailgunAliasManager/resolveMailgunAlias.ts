import crypto from 'crypto';

export interface AliasResolution {
  tenantId: string;
  contactId: string;
  conversationId: string | null;
  valid: boolean;
}

/**
 * Resolves a Mailgun alias back to its component parts
 * Verifies the HMAC hash to ensure the alias is authentic
 *
 * @param alias - The full email alias (e.g., "encoded.hash@mail.example.com")
 * @returns Object containing tenantId, contactId, conversationId, and validity flag
 */
export function resolveMailgunAlias(alias: string): AliasResolution {
  try {
    // Extract the local part (before @)
    const localPart = alias.split('@')[0];
    if (!localPart) {
      return {
        tenantId: '',
        contactId: '',
        conversationId: null,
        valid: false
      };
    }

    // Split into encoded payload and hash
    const lastDotIndex = localPart.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return {
        tenantId: '',
        contactId: '',
        conversationId: null,
        valid: false
      };
    }

    const encoded = localPart.substring(0, lastDotIndex);
    const providedHash = localPart.substring(lastDotIndex + 1);

    // Verify the hash
    const secret = process.env.API_KEY_ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error('API_KEY_ENCRYPTION_SECRET not configured');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(encoded);
    const computedHash = hmac.digest('hex').substring(0, 8);

    if (computedHash !== providedHash) {
      return {
        tenantId: '',
        contactId: '',
        conversationId: null,
        valid: false
      };
    }

    // Decode the payload
    // Reverse the URL-safe replacements
    const base64Payload = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    const paddingNeeded = (4 - (base64Payload.length % 4)) % 4;
    const paddedPayload = base64Payload + '='.repeat(paddingNeeded);

    const payload = Buffer.from(paddedPayload, 'base64').toString('utf-8');

    // Split the payload
    const parts = payload.split('.');
    if (parts.length < 2) {
      return {
        tenantId: '',
        contactId: '',
        conversationId: null,
        valid: false
      };
    }

    const tenantId = parts[0];
    const contactId = parts[1];
    const conversationId = parts[2] === 'none' ? null : parts[2];

    return {
      tenantId,
      contactId,
      conversationId,
      valid: true
    };

  } catch (error) {
    console.error('Error resolving Mailgun alias:', error);
    return {
      tenantId: '',
      contactId: '',
      conversationId: null,
      valid: false
    };
  }
}
