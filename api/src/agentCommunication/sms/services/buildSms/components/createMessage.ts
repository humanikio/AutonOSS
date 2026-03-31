import { Anthropic } from '@anthropic-ai/sdk';

/**
 * Message creation component that uses Claude LLM to generate SMS responses
 * Takes the assembled prompt and generates the actual message content
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export interface CreateMessageRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  caseId?: string;
}

export interface CreateMessageResponse {
  message: string;
  success: boolean;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class CreateMessage {
  /**
   * Generate SMS message using Claude LLM
   */
  static async generateMessage(request: CreateMessageRequest): Promise<CreateMessageResponse> {
    try {
      console.log(`= Creating message using Claude LLM${request.caseId ? ` for case ${request.caseId}` : ''}`);

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Fast model for SMS responses
        max_tokens: request.maxTokens || 300, // SMS responses should be concise
        temperature: request.temperature || 0.3, // Lower temperature for consistent responses
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      });

      // Extract the message content
      const messageContent = response.content[0];
      if (messageContent.type !== 'text') {
        throw new Error('Unexpected response format from Claude API');
      }

      const generatedMessage = messageContent.text.trim();

      // Validate message length for SMS (typically 160 chars for single SMS, but allow up to 320 for two-part)
      if (generatedMessage.length > 320) {
        console.warn(`Generated message is ${generatedMessage.length} characters, which may be too long for SMS`);
      }

      console.log(`= Message generated successfully (${generatedMessage.length} characters)`);
      console.log(`= Preview: "${generatedMessage.substring(0, 50)}${generatedMessage.length > 50 ? '...' : ''}"`);

      return {
        message: generatedMessage,
        success: true,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };

    } catch (error) {
      console.error('Error generating message with Claude:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Return a fallback response structure
      return {
        message: '',
        success: false,
        error: `Claude API error: ${errorMessage}`
      };
    }
  }

  /**
   * Generate message with retry logic for better reliability
   */
  static async generateMessageWithRetry(
    request: CreateMessageRequest,
    maxRetries: number = 2
  ): Promise<CreateMessageResponse> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`= Retrying message generation (attempt ${attempt})`);
        }
        
        const result = await this.generateMessage(request);
        
        if (result.success) {
          if (attempt > 1) {
            console.log(`= Message generation succeeded on attempt ${attempt}`);
          }
          return result;
        }
        
        lastError = result.error || 'Unknown error';
        
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`= Message generation attempt ${attempt} failed:`, lastError);
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt <= maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, etc.
        console.log(`= Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    return {
      message: '',
      success: false,
      error: `Failed after ${maxRetries + 1} attempts. Last error: ${lastError}`
    };
  }

  /**
   * Validate generated message for SMS compatibility
   */
  static validateSmsMessage(message: string): {
    valid: boolean;
    warnings: string[];
    partCount: number;
  } {
    const warnings: string[] = [];
    let valid = true;

    // Check message length
    const singleSmsLimit = 160;
    const twoPartSmsLimit = 320;
    
    if (message.length === 0) {
      valid = false;
      warnings.push('Message is empty');
    } else if (message.length > twoPartSmsLimit) {
      valid = false;
      warnings.push(`Message too long (${message.length} chars, max ${twoPartSmsLimit})`);
    } else if (message.length > singleSmsLimit) {
      warnings.push(`Message will be sent as multiple parts (${message.length} chars)`);
    }

    // Calculate part count
    let partCount = 1;
    if (message.length > singleSmsLimit) {
      partCount = Math.ceil(message.length / 153); // 153 chars per part in multi-part SMS
    }

    // Check for potentially problematic characters
    const problematicChars = /[^\x00-\x7F]/g;
    if (problematicChars.test(message)) {
      warnings.push('Message contains non-ASCII characters that may cause encoding issues');
    }

    return {
      valid,
      warnings,
      partCount
    };
  }
}

export const createMessage = new CreateMessage();