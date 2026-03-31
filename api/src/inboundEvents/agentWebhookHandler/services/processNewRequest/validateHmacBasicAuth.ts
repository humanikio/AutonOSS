import { firestore } from '../../../../config/firebase';
import { webhookSecretsGenerator } from '../../../../agents/agentWebhookSetup/utils/generateWebhookSecrets';

interface ValidationResult {
  success: boolean;
  webhookId?: string;
  error?: string;
  message?: string;
  webhookData?: {
    tenantId: string;
    agentId: string;
    channel: string;
    method: string;
    isActive: boolean;
  };
}

interface BasicAuthCredentials {
  webhookId: string;
  webhookPassword: string;
}

export class ValidateHmacBasicAuthService {
  /**
   * Validate Basic Auth header against stored webhook credentials
   * Supports both standard Authorization header and separate username/password headers (GHL format)
   */
  async validateBasicAuth(authHeader: string, webhookContext: any, headers?: any): Promise<ValidationResult> {
    try {
      console.log('= ValidateHmacBasicAuthService: Starting Basic Auth validation');
      console.log('==� Validating for webhook context:', JSON.stringify({
        tenantId: webhookContext.tenantId,
        agentId: webhookContext.agentId,
        channel: webhookContext.channel,
        method: webhookContext.method
      }, null, 2));
      console.log('== Auth header present:', !!authHeader);
      console.log('=====================================');

      // Step 1: Extract credentials from Authorization header
      console.log('=� Step 1: Extracting credentials from header...');
      const credentials = this.extractBasicAuthCredentials(authHeader, headers);
      
      if (!credentials) {
        console.error('L Step 1 failed: Invalid or missing Basic Auth header');
        return {
          success: false,
          error: 'Invalid Basic Auth header',
          message: 'Authorization header must be in format: Basic [base64(username:password)]'
        };
      }
      
      console.log(' Step 1 complete: Credentials extracted successfully');
      console.log(`=� Username: ${credentials.webhookId}`);
      console.log(`=� Password length: ${credentials.webhookPassword.length}`);

      // Step 2: Query Firestore for webhook with matching credentials and context
      console.log('=� Step 2: Querying Firestore for webhook validation...');
      const webhookValidation = await this.validateWebhookCredentials(credentials, webhookContext);
      
      if (!webhookValidation.success) {
        console.error('L Step 2 failed: Webhook validation failed');
        return webhookValidation;
      }
      
      console.log(' Step 2 complete: Webhook credentials validated');
      console.log('=� Webhook is active and matches context');

      console.log('= Basic Auth validation successful');
      console.log('==� Validation Summary:');
      console.log(`  - Webhook ID: ${credentials.webhookId}`);
      console.log(`  - Tenant ID: ${webhookValidation.webhookData!.tenantId}`);
      console.log(`  - Agent ID: ${webhookValidation.webhookData!.agentId}`);
      console.log(`  - Channel: ${webhookValidation.webhookData!.channel}`);
      console.log(`  - Method: ${webhookValidation.webhookData!.method}`);
      console.log('=====================================');

      return {
        success: true,
        webhookId: credentials.webhookId,
        webhookData: webhookValidation.webhookData
      };

    } catch (error) {
      console.error('=L ValidateHmacBasicAuthService: Unexpected error:', error);
      return {
        success: false,
        error: 'Basic Auth validation service error',
        message: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }

  /**
   * Extract and validate Basic Auth credentials from Authorization header or separate headers
   * Supports both standard Authorization header and GHL's username/password format
   */
  private extractBasicAuthCredentials(authHeader: string, headers?: any): BasicAuthCredentials | null {
    try {
      // First try standard Authorization header format
      if (authHeader && authHeader.startsWith('Basic ')) {
        console.log('📋 Using standard Authorization header format');
        return webhookSecretsGenerator.validateBasicAuth(authHeader);
      }
      
      // Fallback to GHL format: separate username and password headers
      if (headers && (headers.username || headers.Username) && (headers.password || headers.Password)) {
        console.log('📋 Using GHL separate headers format');
        const username = headers.username || headers.Username;
        const password = headers.password || headers.Password;
        
        console.log(`📋 Extracted credentials: username=${username}, password length=${password?.length || 0}`);
        
        return {
          webhookId: username,
          webhookPassword: password
        };
      }
      
      console.error('❌ No valid authentication format found');
      console.log('📋 Available headers:', Object.keys(headers || {}));
      return null;
      
    } catch (error) {
      console.error('Error extracting Basic Auth credentials:', error);
      return null;
    }
  }

  /**
   * Validate webhook credentials against Firestore and ensure context matches
   */
  private async validateWebhookCredentials(
    credentials: BasicAuthCredentials, 
    webhookContext: any
  ): Promise<ValidationResult> {
    try {
      const { webhookId, webhookPassword } = credentials;
      const { tenantId, agentId, channel, method } = webhookContext;

      // Query Firestore for webhooks matching the context
      console.log('=� Querying Firestore for webhook with matching context...');
      const webhooksRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId)
        .collection('webhooks');

      // Query for webhooks with matching credentials and context
      const snapshot = await webhooksRef
        .where('webhookId', '==', webhookId)
        .where('channel', '==', channel)
        .where('method', '==', method)
        .where('isActive', '==', true)
        .get();

      if (snapshot.empty) {
        console.error('L No active webhook found matching credentials and context');
        return {
          success: false,
          error: 'Invalid webhook credentials',
          message: 'No active webhook found with these credentials for this agent and channel'
        };
      }

      // Should only be one matching webhook, but let's be safe
      const webhookDoc = snapshot.docs[0];
      const webhookData = webhookDoc.data();

      console.log('=� Found webhook in Firestore:', {
        docId: webhookDoc.id,
        webhookId: webhookData.webhookId,
        channel: webhookData.channel,
        method: webhookData.method,
        isActive: webhookData.isActive
      });

      // Validate password
      console.log('=� Validating password...');
      if (webhookData.webhookPassword !== webhookPassword) {
        console.error('L Password validation failed');
        return {
          success: false,
          error: 'Invalid webhook credentials',
          message: 'Incorrect password for webhook'
        };
      }

      console.log(' Password validation successful');

      return {
        success: true,
        webhookId,
        webhookData: {
          tenantId: webhookData.tenantId,
          agentId: webhookData.agentId,
          channel: webhookData.channel,
          method: webhookData.method,
          isActive: webhookData.isActive
        }
      };

    } catch (error) {
      console.error('Error validating webhook credentials in Firestore:', error);
      return {
        success: false,
        error: 'Database validation error',
        message: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  /**
   * Helper method to generate a test Basic Auth header (for development/testing)
   */
  generateTestAuthHeader(webhookId: string, webhookPassword: string): string {
    const credentials = `${webhookId}:${webhookPassword}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    return `Basic ${base64Credentials}`;
  }

  /**
   * Validate webhook permissions for specific operations (future enhancement)
   */
  async validateWebhookPermissions(webhookId: string, operation: string): Promise<boolean> {
    // TODO: Implement granular permission checking if needed
    // For now, all active webhooks have full permissions for their channel/method
    return true;
  }
}

export const validateHmacBasicAuthService = new ValidateHmacBasicAuthService();