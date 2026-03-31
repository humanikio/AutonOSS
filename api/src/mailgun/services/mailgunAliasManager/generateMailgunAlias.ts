import crypto from 'crypto';

export interface GenerateAliasParams {
  tenantId: string;
  contactId: string;
  conversationId?: string;
  domain?: string; // Custom domain for alias (for customMailgun provider)
}

/**
 * Generates a unique Mailgun alias for reply-to tracking
 * Format: {base64Payload}.{hash}@domain
 *
 * @param params - Object containing tenantId, contactId, optional conversationId, and optional domain
 * @returns Encoded email alias
 */
export function generateMailgunAlias(params: GenerateAliasParams): string {
  const { tenantId, contactId, conversationId, domain } = params;

  // Create payload string
  const payload = `${tenantId}.${contactId}.${conversationId || 'none'}`;

  // Base64 encode the payload
  const encoded = Buffer.from(payload).toString('base64')
    // Make URL-safe by replacing characters
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding

  // Generate HMAC hash for verification
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET not configured');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(encoded);
  const hash = hmac.digest('hex').substring(0, 8); // Use first 8 chars

  // Construct the full alias - use custom domain if provided, otherwise default domain
  const aliasDomain = domain || process.env.MAILGUN_DEFAULT_DOMAIN || 'mail.example.com';
  const alias = `${encoded}.${hash}@${aliasDomain}`;

  return alias;
}
