import crypto from 'crypto';

interface EmailTestRequest {
  destinationKey: string;
  webhookUrl: string;
  customPayload?: any;
  authType?: 'none' | 'signing_secret';
  signingSecret?: string;
}

interface EmailTestResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
}

export class EmailTest {
  /**
   * Send Email test webhook
   */
  async sendTest(params: EmailTestRequest): Promise<EmailTestResult> {
    try {
      console.log(`📧 Sending Email test webhook to: ${params.webhookUrl}`);

      // Create Email test payload
      const testPayload = params.customPayload || this.createEmailTestPayload(params.destinationKey);

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

      console.log(`📧 Email test webhook response: ${response.status}`);

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseData
      };

    } catch (error) {
      console.error('❌ Email test webhook error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Create realistic Email test payload matching actual backend format
   */
  private createEmailTestPayload(destinationKey: string) {
    const timestamp = new Date().toISOString();
    const contactId = `contact_test_${this.generateId()}`;
    const messageId = `msg_test_${this.generateId()}`;
    const conversationId = `conv_test_${this.generateId()}`;
    const caseId = `case_test_${this.generateId()}`;
    
    return {
      // Core message data that matches Post2DestinationRequest format
      message: 'Thank you for reaching out to us! This is a test email response from your AI agent. We have received your inquiry and our system is working correctly to provide helpful responses. We appreciate your interest and look forward to assisting you further.',
      generatedResponse: 'Thank you for reaching out to us! This is a test email response from your AI agent. We have received your inquiry and our system is working correctly to provide helpful responses. We appreciate your interest and look forward to assisting you further.',
      
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
      messageType: 'email',
      
      // Contact details (if available from contact lookup)
      contactFullName: 'Sarah Test Customer',
      contactFirstName: 'Sarah',
      contactLastName: 'Customer',
      contactEmail: 'sarah.customer@example.com',
      contactPhoneNumber: '+1234567890',
      contactName: 'Sarah Test Customer',
      
      // Optional training/metadata fields
      isTraining: false,
      actionId: 'email_inquiry',
      originalMessage: 'Hi, I\'m interested in learning more about your AI agent services. Could you provide some information about pricing and features?',
      responseMetadata: {
        test: true,
        generatedAt: timestamp,
        model: 'gpt-4',
        confidence: 0.92,
        processingTime: 2156,
        emailFormatting: {
          htmlGenerated: true,
          attachments: false,
          priority: 'normal'
        },
        conversationContext: {
          threadId: `thread_${this.generateId()}`,
          messageCount: 1,
          lastActivity: timestamp,
          customerType: 'prospective'
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

export const emailTest = new EmailTest();