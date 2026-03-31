import { randomBytes, createHash } from 'crypto';

interface WebhookCredentials {
  webhookId: string;      // Username (Key ID) - e.g., whk_live_ab12cd34
  webhookPassword: string; // Password (Secret) - e.g., p_a9f3c0e2b7...
  basicAuthHeader: string; // Pre-computed Basic Auth header for testing
}

interface GenerateSecretsOptions {
  environment?: 'live' | 'test' | 'dev';
  channel: 'sms' | 'email' | 'phone';
  method: 'inbound' | 'outbound';
}

export class WebhookSecretsGenerator {
  /**
   * Generate webhook credentials (username and password) for Basic Auth
   */
  generateWebhookCredentials(options: GenerateSecretsOptions): WebhookCredentials {
    const { environment = 'live', channel, method } = options;
    
    // Generate webhook ID (username) with descriptive format
    // Format: whk_{env}_{channel}_{method}_{random}
    const randomId = this.generateRandomString(8, 'hex');
    const webhookId = `whk_${environment}_${channel}_${method}_${randomId}`;
    
    // Generate webhook password (secret) - longer and more secure
    // Format: p_{random_64_chars}
    const randomSecret = this.generateRandomString(64, 'base62');
    const webhookPassword = `p_${randomSecret}`;
    
    // Pre-compute Basic Auth header for convenience/testing
    const credentials = `${webhookId}:${webhookPassword}`;
    const basicAuthHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    
    console.log('= Generated webhook credentials:');
    console.log(`  - Webhook ID (Username): ${webhookId}`);
    console.log(`  - Password length: ${webhookPassword.length} characters`);
    console.log(`  - Basic Auth header length: ${basicAuthHeader.length} characters`);
    
    return {
      webhookId,
      webhookPassword,
      basicAuthHeader
    };
  }
  
  /**
   * Generate a cryptographically secure random string
   */
  private generateRandomString(length: number, encoding: 'hex' | 'base62' = 'hex'): string {
    if (encoding === 'hex') {
      // Use crypto.randomBytes for hex encoding
      return randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
    }
    
    if (encoding === 'base62') {
      // Use base62 encoding (alphanumeric, no special chars) for secrets
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = randomBytes(length);
      let result = '';
      
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
      }
      
      return result;
    }
    
    throw new Error(`Unsupported encoding: ${encoding}`);
  }
  
  /**
   * Validate Basic Auth header and extract credentials
   */
  validateBasicAuth(authHeader: string): { webhookId: string; webhookPassword: string } | null {
    try {
      // Check if header starts with "Basic "
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return null;
      }
      
      // Extract base64 part
      const base64Credentials = authHeader.substring(6); // Remove "Basic "
      
      // Decode base64
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      
      // Split on first colon (in case password contains colons)
      const colonIndex = credentials.indexOf(':');
      if (colonIndex === -1) {
        return null;
      }
      
      const webhookId = credentials.substring(0, colonIndex);
      const webhookPassword = credentials.substring(colonIndex + 1);
      
      // Basic validation of format
      if (!webhookId.startsWith('whk_') || !webhookPassword.startsWith('p_')) {
        return null;
      }
      
      return { webhookId, webhookPassword };
      
    } catch (error) {
      console.error('Error validating Basic Auth header:', error);
      return null;
    }
  }
  
  /**
   * Generate a secure hash of the password for storage
   * (Optional: if you want to hash passwords before storing)
   */
  hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
  
  /**
   * Verify a password against its hash
   */
  verifyPassword(password: string, hash: string): boolean {
    const computedHash = this.hashPassword(password);
    return computedHash === hash;
  }
  
  /**
   * Generate a webhook URL with embedded credentials for testing
   */
  generateTestUrl(baseUrl: string, encodedData: string, credentials: WebhookCredentials): string {
    const { webhookId, webhookPassword } = credentials;
    
    // Create URL with embedded credentials (for testing only)
    const url = new URL(`${baseUrl}/api/universal-message/${encodedData}`);
    
    // Add basic auth to URL (this is just for convenience, actual auth should use headers)
    const urlWithAuth = `${url.protocol}//${webhookId}:${webhookPassword}@${url.host}${url.pathname}`;
    
    return urlWithAuth;
  }
}

// Export singleton instance
export const webhookSecretsGenerator = new WebhookSecretsGenerator();

// Export types for use in other files
export type { WebhookCredentials, GenerateSecretsOptions };