export class SmsHookVariations {
  /**
   * Get SMS-specific default payload template
   */
  getDefaultPayloadTemplate(): string {
    return JSON.stringify({
      message: '{{message}}',
      contactId: '{{contactId}}',
      agentId: '{{agentId}}',
      tenantId: '{{tenantId}}',
      timestamp: '{{timestamp}}',
      messageId: '{{messageId}}',
      caseId: '{{caseId}}',
      conversationId: '{{conversationId}}',
      fromPhone: '{{fromPhone}}',
      toPhone: '{{toPhone}}',
      messageType: 'sms'
    }, null, 2);
  }

  /**
   * Get SMS-specific default headers
   */
  getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Message-Type': 'sms',
      'User-Agent': 'Pulseline-SMS-Destination/1.0'
    };
  }

  /**
   * Validate SMS-specific configuration
   */
  validateSmsConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // SMS-specific validations can be added here
    // For now, no specific validations for SMS

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get SMS-specific metadata
   */
  getMetadata(): Record<string, any> {
    return {
      category: 'sms',
      supportedVariables: [
        'message',
        'contactId', 
        'agentId',
        'tenantId',
        'timestamp',
        'messageId',
        'caseId',
        'conversationId',
        'fromPhone',
        'toPhone'
      ],
      description: 'SMS destination webhook for redirecting SMS content to external endpoints'
    };
  }
}

export const smsHookVariations = new SmsHookVariations();