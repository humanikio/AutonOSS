import { getDestinationWebhookByKey } from '../../../../agents/agentWebhookSetup/destinationHooks/utils/saveDestinationWebhookFirestore';
import { ManageContactsService } from '../../../../contacts/services/ManageContacts';
import { saveToFirestoreConvo } from '../../../../crm/sms/services/sendSms/saveToFirestoreConvo';
import crypto from 'crypto';

export interface Post2DestinationRequest {
  destinationKey: string;
  tenantId: string;
  agentId: string;
  messageData: {
    message: string;
    contactId: string;
    messageId?: string;
    caseId?: string;
    conversationId?: string;
    fromPhone?: string;
    toPhone?: string;
    timestamp?: string;
    [key: string]: any; // Allow additional fields
  };
}

export interface Post2DestinationResponse {
  success: boolean;
  destinationKey: string;
  statusCode?: number;
  response?: any;
  error?: string;
  timeTaken?: number;
}

export interface ContactDetails {
  contactId: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  name?: string;
}

export class Post2DestinationService {
  private manageContactsService = new ManageContactsService();

  /**
   * Fetch contact details from Firestore
   */
  private async fetchContactDetails(tenantId: string, contactId: string): Promise<ContactDetails | null> {
    try {
      console.log(`📋 Fetching contact details for ${contactId}`);
      
      const contactData = await this.manageContactsService.getContact(tenantId, contactId);
      
      if (!contactData) {
        console.log(`❌ Contact ${contactId} not found`);
        return null;
      }

      return {
        contactId: contactId,
        fullName: contactData.name || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || undefined,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phoneNumber: contactData.phoneNumber,
        name: contactData.name
      };
    } catch (error) {
      console.error(`❌ Error fetching contact details for ${contactId}:`, error);
      return null;
    }
  }

  /**
   * Send message data to configured destination webhook
   */
  async sendToDestination(request: Post2DestinationRequest): Promise<Post2DestinationResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`<� Post2Destination: Sending to destination ${request.destinationKey}`);
      console.log(`=� Message data:`, {
        message: request.messageData.message?.substring(0, 50) + '...',
        contactId: request.messageData.contactId,
        messageId: request.messageData.messageId,
        caseId: request.messageData.caseId
      });

      // Step 1: Retrieve destination webhook configuration
      const webhook = await getDestinationWebhookByKey(
        request.tenantId, 
        request.agentId, 
        request.destinationKey
      );

      if (!webhook) {
        console.error(`L Destination webhook not found: ${request.destinationKey}`);
        return {
          success: false,
          destinationKey: request.destinationKey,
          error: 'Destination webhook not found',
          timeTaken: Date.now() - startTime
        };
      }

      if (!webhook.isActive) {
        console.error(`L Destination webhook is inactive: ${request.destinationKey}`);
        return {
          success: false,
          destinationKey: request.destinationKey,
          error: 'Destination webhook is inactive',
          timeTaken: Date.now() - startTime
        };
      }

      console.log(` Found active destination webhook: ${webhook.name}`);
      console.log(`= Endpoint: ${webhook.endpoint.url}`);
      console.log(`= Auth type: ${webhook.endpoint.authType}`);

      // Step 2: Fetch contact details if contactId is provided
      let contactDetails: ContactDetails | null = null;
      if (request.messageData.contactId) {
        contactDetails = await this.fetchContactDetails(request.tenantId, request.messageData.contactId);
      }

      // Step 3: Process payload template with message data and contact details
      const processedPayload = this.processPayloadTemplate(
        webhook.payloadTemplate, 
        request.messageData,
        request.tenantId,
        request.agentId,
        contactDetails
      );

      console.log(`=� Processed payload:`, JSON.stringify(processedPayload, null, 2));

      // Step 3: Prepare headers with authentication
      const headers = await this.prepareHeaders(webhook, processedPayload);

      // Step 4: Send HTTP request to destination
      console.log(`=� Sending HTTP ${webhook.endpoint.method} to ${webhook.endpoint.url}`);
      
      const response = await fetch(webhook.endpoint.url, {
        method: webhook.endpoint.method,
        headers,
        body: JSON.stringify(processedPayload)
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const timeTaken = Date.now() - startTime;

      if (!response.ok) {
        console.error(`L Destination webhook responded with ${response.status}: ${responseText}`);
        return {
          success: false,
          destinationKey: request.destinationKey,
          statusCode: response.status,
          response: responseData,
          error: `HTTP ${response.status}: ${responseText}`,
          timeTaken
        };
      }

      console.log(` Destination webhook responded successfully (${response.status})`);
      console.log(`� Time taken: ${timeTaken}ms`);

      // Step 5: Save the message to Firestore conversation for UI consistency
      console.log(`💾 Saving destination message to Firestore...`);
      try {
        const messageId = `dest_${request.destinationKey}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await saveToFirestoreConvo.saveDestinationMessage({
          tenantId: request.tenantId,
          contactId: request.messageData.contactId,
          conversationId: request.messageData.conversationId || 'default', // Fallback to default if not provided
          messageId: messageId,
          fromPhoneNumber: request.messageData.fromPhone || 'unknown',
          toPhoneNumber: request.messageData.toPhone || 'unknown', 
          messageBody: request.messageData.message,
          direction: 'outbound',
          agentId: request.agentId,
          destinationKey: request.destinationKey,
          webhookResponse: responseData,
          statusCode: response.status
        });

        console.log(`✅ Destination message saved to Firestore: ${messageId}`);
      } catch (firestoreError) {
        console.error(`⚠️ Failed to save destination message to Firestore (non-blocking):`, firestoreError);
        // Don't fail the whole request if Firestore saving fails
      }

      return {
        success: true,
        destinationKey: request.destinationKey,
        statusCode: response.status,
        response: responseData,
        timeTaken
      };

    } catch (error) {
      const timeTaken = Date.now() - startTime;
      console.error(`L Error sending to destination ${request.destinationKey}:`, error);
      
      return {
        success: false,
        destinationKey: request.destinationKey,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timeTaken
      };
    }
  }

  /**
   * Process payload template by replacing variables with actual data
   */
  private processPayloadTemplate(
    template: string, 
    messageData: any,
    tenantId: string,
    agentId: string,
    contactDetails: ContactDetails | null = null
  ): any {
    try {
      // Parse the template JSON
      let processedTemplate = template;

      // Create combined data object with all available variables
      const templateData = {
        // Message content (with multiple aliases for different naming conventions)
        message: messageData.message,
        generatedResponse: messageData.message, // Alias for message (commonly used in templates)
        
        // Core identifiers
        contactId: messageData.contactId,
        agentId: agentId,
        tenantId: tenantId,
        timestamp: messageData.timestamp || new Date().toISOString(),
        messageId: messageData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        caseId: messageData.caseId,
        conversationId: messageData.conversationId,
        fromPhone: messageData.fromPhone,
        toPhone: messageData.toPhone,
        messageType: 'sms',
        
        // Contact details (if available)
        contactFullName: contactDetails?.fullName,
        contactFirstName: contactDetails?.firstName,
        contactLastName: contactDetails?.lastName,
        contactEmail: contactDetails?.email,
        contactPhoneNumber: contactDetails?.phoneNumber,
        contactName: contactDetails?.name,
        
        // Agent details (only include if we have actual values)
        ...(messageData.agentPhoneNumber && { agentPhoneNumber: messageData.agentPhoneNumber }),
        ...(messageData.agentEmail && { agentEmail: messageData.agentEmail }),
        
        // Training/metadata fields (only include if we have actual values)
        ...(messageData.isTraining !== undefined && { isTraining: messageData.isTraining }),
        ...(messageData.trainingSessionId && { trainingSessionId: messageData.trainingSessionId }),
        ...(messageData.actionId && { actionId: messageData.actionId }),
        ...(messageData.originalMessage && { originalMessage: messageData.originalMessage }),
        ...(messageData.responseMetadata && { responseMetadata: messageData.responseMetadata }),
        
        // Include any additional fields from messageData (this allows for extensibility)
        ...messageData
      };

      // Replace template variables
      for (const [key, value] of Object.entries(templateData)) {
        if (value !== undefined && value !== null && value !== '') {
          const placeholder = `{{${key}}}`;
          // Properly escape the value for JSON insertion
          // Use JSON.stringify to escape special characters, then remove surrounding quotes
          const jsonEscapedValue = JSON.stringify(String(value)).slice(1, -1);
          processedTemplate = processedTemplate.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), jsonEscapedValue);
        }
      }

      console.log(`📋 Template processing summary:`);
      console.log(`  - Original template length: ${template.length} chars`);
      console.log(`  - Processed template length: ${processedTemplate.length} chars`);
      console.log(`  - Variables available:`, Object.keys(templateData).filter(key => templateData[key] !== undefined && templateData[key] !== null));
      
      // Check for any remaining unreplaced variables
      const remainingVariables = processedTemplate.match(/\{\{[^}]+\}\}/g) || [];
      if (remainingVariables.length > 0) {
        console.log(`⚠️  Unreplaced variables found:`, remainingVariables);
      }

      // Parse the final JSON
      return JSON.parse(processedTemplate);

    } catch (error) {
      console.error('Error processing payload template:', error);
      // Fallback to basic payload structure
      return {
        message: messageData.message,
        contactId: messageData.contactId,
        agentId: agentId,
        tenantId: tenantId,
        timestamp: messageData.timestamp || new Date().toISOString(),
        messageType: 'sms'
      };
    }
  }

  /**
   * Prepare headers including authentication
   */
  private async prepareHeaders(webhook: any, payload: any): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pulseline-SMS-Agent/1.0',
      ...webhook.endpoint.headers // Include any configured headers
    };

    // Add authentication headers based on type
    switch (webhook.endpoint.authType) {
      case 'bearer':
        if (webhook.endpoint.authConfig?.token) {
          headers['Authorization'] = `Bearer ${webhook.endpoint.authConfig.token}`;
        }
        break;

      case 'basic':
        if (webhook.endpoint.authConfig?.username && webhook.endpoint.authConfig?.password) {
          const credentials = Buffer.from(
            `${webhook.endpoint.authConfig.username}:${webhook.endpoint.authConfig.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api_key':
        if (webhook.endpoint.authConfig?.apiKey && webhook.endpoint.authConfig?.apiKeyHeader) {
          headers[webhook.endpoint.authConfig.apiKeyHeader] = webhook.endpoint.authConfig.apiKey;
        }
        break;

      case 'signing_secret':
        if (webhook.signingSecret) {
          const signature = this.generateSignature(payload, webhook.signingSecret);
          headers['X-Pulseline-Signature'] = signature;
          headers['X-Pulseline-Signature-256'] = signature;
        }
        break;

      case 'none':
      default:
        // No authentication required
        break;
    }

    return headers;
  }

  /**
   * Generate HMAC signature for signing secret authentication
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return `sha256=${signature}`;
  }
}

export const post2DestinationService = new Post2DestinationService();