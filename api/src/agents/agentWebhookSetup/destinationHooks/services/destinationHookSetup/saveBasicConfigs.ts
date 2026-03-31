import { saveDestinationWebhookFirestore } from '../../utils/saveDestinationWebhookFirestore';

interface BasicConfigData {
  destinationKey: string;
  tenantId: string;
  agentId: string;
  category: 'sms' | 'email' | 'phone';
  name: string;
  description?: string;
  endpoint: {
    url: string;
    method: 'POST';
    headers?: Record<string, string>;
  };
  payloadTemplate?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt: Date;
}

interface AuthData {
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
  authConfig: Record<string, any>;
  signingSecret?: string;
  basicAuthHeader?: string;
}

export class SaveBasicConfigs {
  /**
   * Save basic configuration and auth data to Firestore
   */
  async saveConfiguration(basicConfig: BasicConfigData, authData: AuthData): Promise<void> {
    try {
      console.log(`=� Saving basic configs for destination: ${basicConfig.destinationKey}`);
      
      // Combine basic config with auth data
      const completeWebhookData = {
        ...basicConfig,
        payloadTemplate: basicConfig.payloadTemplate || '{}',
        endpoint: {
          ...basicConfig.endpoint,
          headers: basicConfig.endpoint.headers || {},
          authType: authData.authType,
          authConfig: authData.authConfig
        },
        // Add auth-specific fields
        signingSecret: authData.signingSecret,
        basicAuthHeader: authData.basicAuthHeader,
        // Metadata for tracking
        metadata: {
          authSetup: authData.authType !== 'none',
          authMethod: authData.authType,
          hasSigningSecret: !!authData.signingSecret,
          configuredAt: new Date().toISOString()
        }
      };

      // Save to Firestore using the existing utility
      await saveDestinationWebhookFirestore(completeWebhookData);
      
      console.log(` Basic configuration saved for: ${basicConfig.destinationKey}`);
      
    } catch (error) {
      console.error('L Error saving basic configuration:', error);
      throw new Error(`Failed to save basic configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate basic configuration data
   */
  validateBasicConfig(config: Partial<BasicConfigData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name || config.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!config.endpoint?.url || config.endpoint.url.trim().length === 0) {
      errors.push('Endpoint URL is required');
    }

    if (config.endpoint?.url && !this.isValidUrl(config.endpoint.url)) {
      errors.push('Endpoint URL must be a valid HTTP/HTTPS URL');
    }

    if (!config.category || !['sms', 'email', 'phone'].includes(config.category)) {
      errors.push('Category must be one of: sms, email, phone');
    }

    if (!config.tenantId || config.tenantId.trim().length === 0) {
      errors.push('Tenant ID is required');
    }

    if (!config.agentId || config.agentId.trim().length === 0) {
      errors.push('Agent ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Sanitize and prepare endpoint headers
   */
  sanitizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    // Remove any auth headers that should be handled by authSetup
    const restrictedHeaders = ['authorization', 'x-api-key', 'x-signature'];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (!restrictedHeaders.includes(lowerKey)) {
        sanitized[key] = value;
      }
    }

    // Add default headers if not present
    if (!sanitized['Content-Type'] && !sanitized['content-type']) {
      sanitized['Content-Type'] = 'application/json';
    }

    return sanitized;
  }
}

export const saveBasicConfigs = new SaveBasicConfigs();