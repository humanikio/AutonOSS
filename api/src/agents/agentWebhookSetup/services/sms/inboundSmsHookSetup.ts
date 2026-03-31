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

export class InboundSmsHookSetup {
  private readonly baseUrl = process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:8000';

  async createWebhook(params: WebhookSetupParams): Promise<WebhookCreationResult> {
    try {
      const { agentId, tenantId, actionId, name, description } = params;

      // Generate webhook credentials (username and password)
      const credentials: WebhookCredentials = webhookSecretsGenerator.generateWebhookCredentials({
        environment: 'live', // TODO: Make this configurable based on environment
        channel: 'sms',
        method: 'inbound'
      });

      // Create the data to be base64 encoded
      const webhookData = {
        tenantId,
        agentId,
        actionId,
        channel: 'sms',
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
        channel: 'sms' as const,
        method: 'inbound' as const,
        name: name || `SMS Inbound Webhook - ${new Date().toISOString().split('T')[0]}`,
        description: description || 'Inbound SMS webhook for processing incoming SMS messages',
        isActive: true,
        createdAt,
        updatedAt: createdAt,
        // Store webhook credentials
        webhookId: credentials.webhookId,
        webhookPassword: credentials.webhookPassword, // Store plaintext for now, hash later if needed
        basicAuthHeader: credentials.basicAuthHeader,
        metadata: {
          internalId: credentials.webhookId, // Use generated ID as internal tracking ID
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
        channel: 'sms',
        method: 'inbound',
        encodedData,
        createdAt
      };

      console.log('Created inbound SMS webhook:', {
        webhookId: credentials.webhookId,
        agentId,
        tenantId,
        encodedData: encodedData.substring(0, 20) + '...', // Log partial encoded data for security
        passwordLength: credentials.webhookPassword.length
      });

      return result;
    } catch (error) {
      console.error('Error creating inbound SMS webhook:', error);
      throw new Error(`Failed to create inbound SMS webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Validate if a decoded webhook is for SMS inbound
   */
  validateSmsInboundWebhook(decodedData: any): boolean {
    return decodedData?.channel === 'sms' && decodedData?.method === 'inbound';
  }
}

export const inboundSmsHookSetup = new InboundSmsHookSetup();