/**
 * API Key Encryption Utilities
 * Uses AES-256-CBC to encrypt/decrypt API keys before storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

// Get encryption key from environment variable
// This should be a 32-byte (64 hex chars) string
function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is not set');
  }

  if (secret.length !== 64) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(secret, 'hex');
}

/**
 * Encrypt an API secret for storage
 *
 * @param rawKey - The plain text API secret
 * @returns Encrypted string in format "iv:encryptedData"
 */
export function encryptApiKey(rawKey: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();

  // Generate random initialization vector
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // Encrypt the key
  let encrypted = cipher.update(rawKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + encrypted data (IV is needed for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an API secret from storage
 *
 * @param encryptedKey - Encrypted string in format "iv:encryptedData"
 * @returns Decrypted plain text API secret
 */
export function decryptApiKey(encryptedKey: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();

  // Split IV and encrypted data
  const parts = encryptedKey.split(':');

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted key format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  // Decrypt the key
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
