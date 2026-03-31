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

export class OutboundSmsHookSetup {
  private readonly baseUrl = process.env.API_BASE_URL || process.env.API_URL || 'http://localhost:8000';

  async createWebhook(params: WebhookSetupParams): Promise<WebhookCreationResult> {
    try {
      const { agentId, tenantId, actionId, name, description } = params;

      console.log('Creating SMS outbound webhook for:', {
        agentId,
        tenantId,
        name: name || 'default',
        description: description || 'SMS outbound webhook'
      });

      // Generate webhook credentials (username and password)
      const credentials: WebhookCredentials = webhookSecretsGenerator.generateWebhookCredentials({
        environment: 'live', // TODO: Make this configurable based on environment
        channel: 'sms',
        method: 'outbound'
      });

      console.log('Generated webhook credentials:', {
        webhookId: credentials.webhookId,
        passwordLength: credentials.webhookPassword.length,
        basicAuthHeaderLength: credentials.basicAuthHeader.length
      });

      // Create the data to be base64 encoded
      const webhookData = {
        tenantId,
        agentId,
        actionId,
        channel: 'sms',
        method: 'outbound'
      };

      // Base64 encode the webhook data
      const encodedData = Buffer.from(JSON.stringify(webhookData)).toString('base64');
      
      console.log('Generated base64 encoded data:', {
        originalData: webhookData,
        encodedLength: encodedData.length,
        encodedPreview: encodedData.substring(0, 20) + '...'
      });
      
      // Generate webhook URL
      const webhookUrl = `${this.baseUrl}/api/universal-message/${encodedData}`;
      
      console.log('Generated webhook URL:', {
        baseUrl: this.baseUrl,
        fullUrlLength: webhookUrl.length
      });
      
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
        method: 'outbound' as const,
        name: name || `SMS Outbound Webhook - ${new Date().toISOString().split('T')[0]}`,
        description: description || 'Outbound SMS webhook for sending messages via actionId',
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
          credentialsGenerated: true,
          webhookType: 'sms_outbound',
          supportedActions: [
            'send_message',
            'nurture_stage_1',
            'nurture_stage_2', 
            'support_inquiry',
            'sales_qualified',
            'booking_confirmation',
            'follow_up',
            'custom'
          ]
        }
      };

      console.log('Saving webhook to Firestore with data structure:', {
        webhookId: firestoreData.webhookId,
        channel: firestoreData.channel,
        method: firestoreData.method,
        isActive: firestoreData.isActive,
        hasMetadata: !!firestoreData.metadata,
        supportedActionsCount: firestoreData.metadata.supportedActions.length
      });

      // Save to Firestore
      await saveAgentWebhookFirestore(firestoreData);

      console.log('Successfully saved SMS outbound webhook to Firestore');

      // Return the result
      const result: WebhookCreationResult = {
        webhookUrl,
        webhookId: credentials.webhookId,
        webhookPassword: credentials.webhookPassword,
        basicAuthHeader: credentials.basicAuthHeader,
        channel: 'sms',
        method: 'outbound',
        encodedData,
        createdAt
      };

      console.log('SMS outbound webhook creation completed:', {
        webhookId: credentials.webhookId,
        agentId,
        tenantId,
        encodedData: encodedData.substring(0, 20) + '...', // Log partial encoded data for security
        passwordLength: credentials.webhookPassword.length,
        resultKeys: Object.keys(result)
      });

      return result;
    } catch (error) {
      console.error('Error creating SMS outbound webhook:', error);
      throw new Error(`Failed to create SMS outbound webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Validate if a decoded webhook is for SMS outbound
   */
  validateSmsOutboundWebhook(decodedData: any): boolean {
    return decodedData?.channel === 'sms' && decodedData?.method === 'outbound';
  }

  /**
   * Get supported action IDs for SMS outbound webhooks
   */
  getSupportedActionIds(): string[] {
    return [
      'send_message',
      'nurture_stage_1',
      'nurture_stage_2',
      'support_inquiry', 
      'sales_qualified',
      'booking_confirmation',
      'follow_up',
      'custom'
    ];
  }

  /**
   * Generate example payload for SMS outbound webhook
   */
  generateExamplePayload(actionId: string = 'send_message'): object {
    return {
      // Target recipient
      toAddress: "+1234567890",           // Target phone number (required)
      
      // Action configuration
      action: actionId,                   // Action ID to trigger (required)
      actionId: actionId,                 // Alternative field name
      
      // Contact information (optional - for personalization)
      contactId: "contact_123456",        // Existing contact ID
      first_name: "John",
      last_name: "Doe", 
      email: "john.doe@example.com",
      
      // Custom data for message personalization (optional)
      customData: {
        customerName: "John Doe",
        appointmentDate: "2024-03-15T10:00:00Z", 
        productName: "Premium Plan",
        companyName: "Acme Corp",
        // Add any data relevant to your action
      },
      
      // Message overrides (optional)
      messageContent: "Custom message content (overrides action default)",
      
      // Workflow information (optional)
      workflow: {
        id: "workflow_456789",
        name: "SMS Outbound Campaign"
      },
      
      // Tracking (optional)
      campaignId: "campaign_spring_2024",
      source: "webhook_automation"
    };
  }
}

export const outboundSmsHookSetup = new OutboundSmsHookSetup();