import { saveAgentWebhookFirestore } from '../../utils/saveAgentWebhookFirestore';
import { webhookSecretsGenerator, WebhookCredentials } from '../../utils/generateWebhookSecrets';

interface WebhookSetupParams {
  agentId: string;
  tenantId: string;
  actionId: string;
  name?: string;
  description?: string;
}

interface WebhookCreationResult {
  webhookUrl: string;
  webhookId: string;
  webhookPassword: string;
  channel: string;
  method: string;
  encodedData: string;
  createdAt: Date;
  basicAuthHeader: string;
}

export class InboundEmailHookSetup {
  private readonly baseUrl = process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:8000';

  async createWebhook(params: WebhookSetupParams): Promise<WebhookCreationResult> {
    try {
      const { agentId, tenantId, actionId, name, description } = params;

      // Generate webhook credentials (username and password)
      const credentials: WebhookCredentials = webhookSecretsGenerator.generateWebhookCredentials({
        environment: 'live', // TODO: Make this configurable based on environment
        channel: 'email',
        method: 'inbound'
      });

      // Create the data to be base64 encoded
      const webhookData = {
        tenantId,
        agentId,
        actionId,
        channel: 'email',
        method: 'inbound'
      };

      // Base64 encode the webhook data
      const encodedData = Buffer.from(JSON.stringify(webhookData)).toString('base64');
      
      // Generate webhook URL
      const webhookUrl = `${this.baseUrl}/api/universal-message/${encodedData}`;
      
      // Create timestamp
      const createdAt = new Date();
      
      // Prepare data for Firestore
      const firestoreData = {
        webhookUrl: encodedData, // Keep for backward compatibility
        encodedData: encodedData, // Add for frontend consistency
        tenantId,
        agentId,
        actionId,
        channel: 'email' as const,
        method: 'inbound' as const,
        name: name || `Email Inbound Webhook - ${new Date().toISOString().split('T')[0]}`,
        description: description || 'Inbound email webhook for processing incoming email messages',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
        // Store webhook credentials
        webhookId: credentials.webhookId,
        webhookPassword: credentials.webhookPassword,
        basicAuthHeader: credentials.basicAuthHeader,
        metadata: {
          internalId: credentials.webhookId,
          fullUrl: webhookUrl,
          encodedPayload: encodedData,
          actionId: actionId,
          credentialsGenerated: true
        }
      };

      // Save to Firestore
      await saveAgentWebhookFirestore(firestoreData);

      // Return the result
      const result: WebhookCreationResult = {
        webhookUrl,
        webhookId: credentials.webhookId,
        webhookPassword: credentials.webhookPassword,
        basicAuthHeader: credentials.basicAuthHeader,
        channel: 'email',
        method: 'inbound',
        encodedData,
        createdAt
      };

      console.log('Created inbound email webhook:', {
        webhookId: credentials.webhookId,
        agentId,
        tenantId,
        encodedData: encodedData.substring(0, 20) + '...',
        passwordLength: credentials.webhookPassword.length
      });

      return result;
    } catch (error) {
      console.error('Error creating inbound email webhook:', error);
      throw new Error(`Failed to create inbound email webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decode a base64 encoded webhook URL to get the original data
   */
  decodeWebhookUrl(encodedData: string): {
    tenantId: string;
    agentId: string;
    actionId: string;
    channel: string;
    method: string;
  } | null {
    try {
      const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
      const data = JSON.parse(decodedString);
      
      // Validate required fields
      if (!data.tenantId || !data.agentId || !data.actionId || !data.channel || !data.method) {
        throw new Error('Invalid webhook data structure');
      }

      return data;
    } catch (error) {
      console.error('Error decoding webhook URL:', error);
      return null;
    }
  }

  /**
   * Validate if a decoded webhook is for email inbound
   */
  validateEmailInboundWebhook(decodedData: any): boolean {
    return decodedData?.channel === 'email' && decodedData?.method === 'inbound';
  }
}

export const inboundEmailHookSetup = new InboundEmailHookSetup();