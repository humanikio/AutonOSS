import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Generate encryption key from environment variable or fallback
function getEncryptionKey(): Buffer {
  const keyString = process.env.TOTP_ENCRYPTION_KEY || 'default-totp-encryption-key-change-in-production';
  
  // Use SHA-256 to ensure we have a 32-byte key
  return crypto.createHash('sha256').update(keyString).digest();
}

export const encryptionService = {
  encrypt: (text: string): string => {
    try {
      const key = getEncryptionKey();
      const iv = crypto.randomBytes(IV_LENGTH);
      
      const cipher = crypto.createCipher(ALGORITHM, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine iv + encrypted data
      return iv.toString('hex') + ':' + encrypted;
      
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw new Error('Encryption failed');
    }
  },

  decrypt: (encryptedData: string): string => {
    try {
      const key = getEncryptionKey();
      
      // Split iv and encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher(ALGORITHM, key);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw new Error('Decryption failed');
    }
  },

  hashBackupCode: (code: string): string => {
    return crypto.createHash('sha256').update(code).digest('hex');
  },

  generateBackupCode: (): string => {
    // Generate 8-character alphanumeric backup code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};