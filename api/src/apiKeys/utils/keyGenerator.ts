/**
 * API Key Generator
 * Generates secure two-part API keys (Access Key ID + API Secret)
 */

import crypto from 'crypto';

export interface GeneratedApiKey {
  accessKeyId: string;   // plkey_abc123... (for identification)
  apiSecret: string;     // plsec_xyz789... (for authentication)
  fullKey: string;       // accessKeyId.apiSecret (returned once)
  secretLastFour: string; // Last 4 chars of secret for UI display
}

/**
 * Generate a new two-part API key
 *
 * Format:
 *   Access Key ID: plkey_abc123def456ghi789jkl012
 *   API Secret:    plsec_xyz789uvw456rst123opq789mno456pqr123stu456
 *   Full Key:      plkey_abc123def456ghi789jkl012.plsec_xyz789uvw456rst123opq789mno456pqr123stu456
 *
 * @param environment - 'live' for production, 'test' for development (currently unused but reserved)
 * @returns Object with accessKeyId, apiSecret, fullKey, and secretLastFour
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): GeneratedApiKey {
  // Generate Access Key ID (20 random bytes = 40 hex chars)
  const keyIdRandom = crypto.randomBytes(20).toString('hex').toLowerCase();
  const accessKeyId = `plkey_${keyIdRandom}`;

  // Generate API Secret (32 random bytes = 64 hex chars)
  const secretRandom = crypto.randomBytes(32).toString('hex').toLowerCase();
  const apiSecret = `plsec_${secretRandom}`;

  // Combine into full key with dot separator
  const fullKey = `${accessKeyId}.${apiSecret}`;

  // Last 4 characters of secret for UI display
  const secretLastFour = apiSecret.slice(-4);

  return {
    accessKeyId,
    apiSecret,
    fullKey,
    secretLastFour
  };
}
