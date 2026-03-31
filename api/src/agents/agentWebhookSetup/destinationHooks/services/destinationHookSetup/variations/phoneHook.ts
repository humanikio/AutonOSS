export class PhoneHookVariations {
  /**
   * Get Phone-specific default payload template
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
      callDuration: '{{callDuration}}',
      messageType: 'phone'
    }, null, 2);
  }

  /**
   * Get Phone-specific default headers
   */
  getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Message-Type': 'phone',
      'User-Agent': 'Pulseline-Phone-Destination/1.0'
    };
  }

  /**
   * Validate Phone-specific configuration
   */
  validatePhoneConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Phone-specific validations can be added here
    // For now, no specific validations for Phone

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get Phone-specific metadata
   */
  getMetadata(): Record<string, any> {
    return {
      category: 'phone',
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
        'toPhone',
        'callDuration'
      ],
      description: 'Phone destination webhook for redirecting phone call content to external endpoints'
    };
  }
}

export const phoneHookVariations = new PhoneHookVariations();