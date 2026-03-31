import crypto from 'crypto';

export interface MailgunWebhookAuth {
  timestamp: string;
  token: string;
  signature: string;
}

/**
 * Authenticates a Mailgun webhook request by verifying the signature
 *
 * Mailgun signs all webhook requests with HMAC-SHA256
 * The signature is computed as: HMAC-SHA256(timestamp + token, signing_key)
 *
 * @param authData - Object containing timestamp, token, and signature from webhook
 * @returns true if signature is valid, false otherwise
 * @throws Error if MAILGUN_INBOUND_WEBHOOK_SECRET is not configured
 */
export function authenticateMailgunInbound(authData: MailgunWebhookAuth): boolean {
  try {
    console.log('= Authenticating Mailgun webhook request...');

    // Get webhook signing key from environment
    const signingKey = process.env.MAILGUN_INBOUND_WEBHOOK_SECRET;

    if (!signingKey) {
      throw new Error('MAILGUN_INBOUND_WEBHOOK_SECRET not configured');
    }

    // Validate required fields
    if (!authData.timestamp || !authData.token || !authData.signature) {
      console.error('L Missing required authentication fields');
      return false;
    }

    // Compute the expected signature
    // Mailgun signature = HMAC-SHA256(timestamp + token, signing_key)
    const data = authData.timestamp + authData.token;
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(data);
    const computedSignature = hmac.digest('hex');

    // Compare signatures (constant-time comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(authData.signature)
    );

    if (isValid) {
      console.log(' Mailgun webhook signature verified');
    } else {
      console.error('L Invalid Mailgun webhook signature');
    }

    return isValid;

  } catch (error) {
    console.error('L Error authenticating Mailgun webhook:', error);
    return false;
  }
}
