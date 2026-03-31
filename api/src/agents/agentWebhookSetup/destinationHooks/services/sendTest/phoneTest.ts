import crypto from 'crypto';

interface PhoneTestRequest {
  destinationKey: string;
  webhookUrl: string;
  customPayload?: any;
  authType?: 'none' | 'signing_secret';
  signingSecret?: string;
}

interface PhoneTestResult {
  success: boolean;
  statusCode?: number;
  response?: any;
  error?: string;
}

export class PhoneTest {
  /**
   * Send Phone test webhook
   */
  async sendTest(params: PhoneTestRequest): Promise<PhoneTestResult> {
    try {
      console.log(`📞 Sending Phone test webhook to: ${params.webhookUrl}`);

      // Create Phone test payload
      const testPayload = params.customPayload || this.createPhoneTestPayload(params.destinationKey);

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

      console.log(`📞 Phone test webhook response: ${response.status}`);

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseData
      };

    } catch (error) {
      console.error('❌ Phone test webhook error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Create realistic Phone test payload matching actual backend format
   */
  private createPhoneTestPayload(destinationKey: string) {
    const timestamp = new Date().toISOString();
    const contactId = `contact_test_${this.generateId()}`;
    const messageId = `msg_test_${this.generateId()}`;
    const conversationId = `conv_test_${this.generateId()}`;
    const caseId = `case_test_${this.generateId()}`;
    
    return {
      // Core message data that matches Post2DestinationRequest format
      message: 'Hello, this is a test call script from your AI agent. Thank you for calling our support line. Your call would normally be handled by our AI voice assistant, but this is a test of the webhook system. Everything appears to be working correctly.',
      generatedResponse: 'Hello, this is a test call script from your AI agent. Thank you for calling our support line. Your call would normally be handled by our AI voice assistant, but this is a test of the webhook system. Everything appears to be working correctly.',
      
      // Core identifiers
      contactId: contactId,
      agentId: 'test_agent_' + this.generateId(),
      tenantId: 'test_tenant_' + this.generateId(),
      timestamp: timestamp,
      messageId: messageId,
      caseId: caseId,
      conversationId: conversationId,
      fromPhone: '+1234567890',
      toPhone: '+1987654321',
      messageType: 'phone',
      
      // Contact details (if available from contact lookup)
      contactFullName: 'Michael Test Caller',
      contactFirstName: 'Michael',
      contactLastName: 'Caller',
      contactEmail: 'michael.caller@example.com',
      contactPhoneNumber: '+1234567890',
      contactName: 'Michael Test Caller',
      
      // Optional training/metadata fields
      isTraining: false,
      actionId: 'phone_support',
      originalMessage: 'Hi, I need help with my account. I\'ve been having issues accessing my dashboard and need assistance.',
      responseMetadata: {
        test: true,
        generatedAt: timestamp,
        model: 'gpt-4-voice',
        confidence: 0.88,
        processingTime: 891,
        voiceSettings: {
          voice: 'assistant-professional',
          speed: 1.0,
          pitch: 'normal',
          language: 'en-US'
        },
        callContext: {
          callId: `call_${this.generateId()}`,
          duration: 0,
          status: 'active',
          transferRequested: false,
          escalationLevel: 0,
          customerMood: 'neutral'
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

export const phoneTest = new PhoneTest();