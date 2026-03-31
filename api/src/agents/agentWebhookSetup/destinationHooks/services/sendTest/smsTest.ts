import crypto from 'crypto';

interface SmsTestRequest {
  destinationKey: string;
  webhookUrl: string;
  customPayload?: any;
  authType?: 'none' | 'signing_secret';
  signingSecret?: string;
}

interface SmsTestResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
}

export class SmsTest {
  /**
   * Send SMS test webhook
   */
  async sendTest(params: SmsTestRequest): Promise<SmsTestResult> {
    try {
      console.log(`=� Sending SMS test webhook to: ${params.webhookUrl}`);

      // Create SMS test payload
      const testPayload = params.customPayload || this.createSmsTestPayload(params.destinationKey);

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Pulseline-Webhook-Test/1.0'
      };

      // Add authentication if required
      if (params.authType === 'signing_secret' && params.signingSecret) {
        const signature = this.generateSignature(JSON.stringify(testPayload), params.signingSecret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Send the webhook
      const response = await fetch(params.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload)
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (parseError) {
        responseData = 'Unable to parse response';
      }

      console.log(`=� SMS test webhook response: ${response.status}`);

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseData
      };

    } catch (error) {
      console.error('L SMS test webhook error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Create realistic SMS test payload matching actual backend format
   */
  private createSmsTestPayload(destinationKey: string) {
    const timestamp = new Date().toISOString();
    const contactId = `contact_test_${this.generateId()}`;
    const messageId = `msg_test_${this.generateId()}`;
    const conversationId = `conv_test_${this.generateId()}`;
    const caseId = `case_test_${this.generateId()}`;
    
    return {
      // Core message data that matches Post2DestinationRequest format
      message: 'Hello! This is a test SMS message from your AI agent. The system is working correctly and ready to handle real conversations with customers.',
      generatedResponse: 'Hello! This is a test SMS message from your AI agent. The system is working correctly and ready to handle real conversations with customers.',
      
      // Core identifiers
      contactId: contactId,
      agentId: 'test_agent_' + this.generateId(),
      tenantId: 'test_tenant_' + this.generateId(),
      timestamp: timestamp,
      messageId: messageId,
      caseId: caseId,
      conversationId: conversationId,
      fromPhone: '+1987654321',
      toPhone: '+1234567890',
      messageType: 'sms',
      
      // Contact details (if available from contact lookup)
      contactFullName: 'John Test User',
      contactFirstName: 'John',
      contactLastName: 'User',
      contactEmail: 'john.testuser@example.com',
      contactPhoneNumber: '+1234567890',
      contactName: 'John Test User',
      
      // Optional training/metadata fields
      isTraining: false,
      actionId: 'general_inquiry',
      originalMessage: 'Hi there! How can you help me today? I\'m interested in learning more about your services.',
      responseMetadata: {
        test: true,
        generatedAt: timestamp,
        model: 'gpt-4',
        confidence: 0.95,
        processingTime: 1247,
        conversationContext: {
          messageCount: 3,
          lastActivity: timestamp,
          customerSatisfaction: 'positive'
        }
      }
    };
  }

  /**
   * Generate HMAC-SHA256 signature for webhook verification
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Generate random ID for test data
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const smsTest = new SmsTest();