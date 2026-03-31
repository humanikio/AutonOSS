export class EmailHookVariations {
  /**
   * Get Email-specific default payload template
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
      fromEmail: '{{fromEmail}}',
      toEmail: '{{toEmail}}',
      subject: '{{subject}}',
      messageType: 'email'
    }, null, 2);
  }

  /**
   * Get Email-specific default headers
   */
  getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Message-Type': 'email',
      'User-Agent': 'Pulseline-Email-Destination/1.0'
    };
  }

  /**
   * Validate Email-specific configuration
   */
  validateEmailConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email-specific validations can be added here
    // For now, no specific validations for Email

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get Email-specific metadata
   */
  getMetadata(): Record<string, any> {
    return {
      category: 'email',
      supportedVariables: [
        'message',
        'contactId', 
        'agentId',
        'tenantId',
        'timestamp',
        'messageId',
        'caseId',
        'conversationId',
        'fromEmail',
        'toEmail',
        'subject'
      ],
      description: 'Email destination webhook for redirecting email content to external endpoints'
    };
  }
}

export const emailHookVariations = new EmailHookVariations();