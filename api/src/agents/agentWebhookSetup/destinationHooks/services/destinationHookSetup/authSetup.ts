import { webhookSecretsGenerator, WebhookCredentials } from '../../../utils/generateWebhookSecrets';

interface AuthSetupParams {
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'signing_secret';
  category: 'sms' | 'email' | 'phone';
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
}

interface AuthSetupResult {
  success: boolean;
  authType: string;
  authConfig: Record<string, any>;
  signingSecret?: string;
  basicAuthHeader?: string;
  error?: string;
}

export class AuthSetup {
  /**
   * Setup authentication for destination webhook
   */
  async setupAuth(params: AuthSetupParams): Promise<AuthSetupResult> {
    try {
      console.log(`= Setting up auth for destination webhook: ${params.authType}`);

      switch (params.authType) {
        case 'none':
          return this.setupNoAuth();
        
        case 'signing_secret':
          return this.setupSigningSecret(params.category);
        
        case 'bearer':
          return this.setupBearerAuth(params.authConfig?.token);
        
        case 'basic':
          return this.setupBasicAuth(params.authConfig?.username, params.authConfig?.password);
        
        case 'api_key':
          return this.setupApiKeyAuth(params.authConfig?.apiKey, params.authConfig?.apiKeyHeader);
        
        default:
          return {
            success: false,
            authType: params.authType,
            authConfig: {},
            error: `Unsupported auth type: ${params.authType}`
          };
      }

    } catch (error) {
      console.error('L Error setting up authentication:', error);
      return {
        success: false,
        authType: params.authType,
        authConfig: {},
        error: error instanceof Error ? error.message : 'Unknown auth setup error'
      };
    }
  }

  /**
   * Setup no authentication
   */
  private setupNoAuth(): AuthSetupResult {
    console.log(' No authentication configured');
    return {
      success: true,
      authType: 'none',
      authConfig: {}
    };
  }

  /**
   * Setup signing secret authentication (similar to existing webhook system)
   */
  private setupSigningSecret(category: 'sms' | 'email' | 'phone'): AuthSetupResult {
    try {
      console.log('= Generating signing secret for destination webhook...');
      
      // Generate webhook credentials using existing system
      const credentials: WebhookCredentials = webhookSecretsGenerator.generateWebhookCredentials({
        environment: 'live', // TODO: Make this configurable based on environment
        channel: category,
        method: 'outbound'
      });

      console.log(' Signing secret generated successfully');

      return {
        success: true,
        authType: 'signing_secret',
        authConfig: {
          signingMethod: 'hmac-sha256',
          signatureHeader: 'X-Signature',
          webhookId: credentials.webhookId
        },
        signingSecret: credentials.webhookPassword, // This is the signing secret
        basicAuthHeader: credentials.basicAuthHeader // For backward compatibility
      };

    } catch (error) {
      console.error('L Error generating signing secret:', error);
      return {
        success: false,
        authType: 'signing_secret',
        authConfig: {},
        error: 'Failed to generate signing secret'
      };
    }
  }

  /**
   * Setup bearer token authentication
   */
  private setupBearerAuth(token?: string): AuthSetupResult {
    if (!token || token.trim().length === 0) {
      return {
        success: false,
        authType: 'bearer',
        authConfig: {},
        error: 'Bearer token is required'
      };
    }

    console.log(' Bearer token authentication configured');

    return {
      success: true,
      authType: 'bearer',
      authConfig: {
        token: token.trim(),
        header: 'Authorization',
        format: 'Bearer {{token}}'
      }
    };
  }

  /**
   * Setup basic authentication
   */
  private setupBasicAuth(username?: string, password?: string): AuthSetupResult {
    if (!username || username.trim().length === 0) {
      return {
        success: false,
        authType: 'basic',
        authConfig: {},
        error: 'Username is required for basic auth'
      };
    }

    if (!password || password.trim().length === 0) {
      return {
        success: false,
        authType: 'basic',
        authConfig: {},
        error: 'Password is required for basic auth'
      };
    }

    // Generate basic auth header
    const credentials = Buffer.from(`${username.trim()}:${password.trim()}`).toString('base64');
    const basicAuthHeader = `Basic ${credentials}`;

    console.log(' Basic authentication configured');

    return {
      success: true,
      authType: 'basic',
      authConfig: {
        username: username.trim(),
        password: password.trim(),
        header: 'Authorization'
      },
      basicAuthHeader
    };
  }

  /**
   * Setup API key authentication
   */
  private setupApiKeyAuth(apiKey?: string, apiKeyHeader?: string): AuthSetupResult {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        success: false,
        authType: 'api_key',
        authConfig: {},
        error: 'API key is required'
      };
    }

    const headerName = apiKeyHeader?.trim() || 'X-API-Key';

    console.log(' API key authentication configured');

    return {
      success: true,
      authType: 'api_key',
      authConfig: {
        apiKey: apiKey.trim(),
        header: headerName,
        format: '{{apiKey}}'
      }
    };
  }

  /**
   * Validate auth configuration
   */
  validateAuthConfig(authType: string, authConfig?: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (authType) {
      case 'none':
        // No validation needed for no auth
        break;
      
      case 'signing_secret':
        // Signing secret is auto-generated, no validation needed
        break;
      
      case 'bearer':
        if (!authConfig?.token) {
          errors.push('Bearer token is required');
        }
        break;
      
      case 'basic':
        if (!authConfig?.username) {
          errors.push('Username is required for basic auth');
        }
        if (!authConfig?.password) {
          errors.push('Password is required for basic auth');
        }
        break;
      
      case 'api_key':
        if (!authConfig?.apiKey) {
          errors.push('API key is required');
        }
        break;
      
      default:
        errors.push(`Unsupported auth type: ${authType}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const authSetup = new AuthSetup();