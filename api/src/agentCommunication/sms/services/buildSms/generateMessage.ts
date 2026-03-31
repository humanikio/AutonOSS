import { BuildPrompt, AnalysisData, MessageContext, AgentConfig } from './components/buildPrompt';
import { CreateMessage } from './components/createMessage';
import { ActionData } from '../actionPromptService';

/**
 * Main orchestrator for SMS message generation
 * Coordinates the prompt building and message creation sub-modules
 */

export interface GenerateMessageRequest {
  analysisData: AnalysisData;
  messageContext: MessageContext;
  agentConfig: AgentConfig;
  tenantId: string; // NEW: Required for baseline document loading
  caseId?: string;
  actionData?: ActionData | null; // NEW: Optional action context
  isOutbound?: boolean; // NEW: Flag for outbound messages
  options?: {
    maxTokens?: number;
    temperature?: number;
    enableRetry?: boolean;
    maxRetries?: number;
  };
}

export interface GenerateMessageResponse {
  message: string;
  success: boolean;
  error?: string;
  metadata: {
    promptLength: number;
    messageLength: number;
    smsPartCount: number;
    validationWarnings: string[];
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
    processingTime: number;
  };
  caseId?: string;
}

export class GenerateMessage {
  /**
   * Generate SMS message by orchestrating prompt building and message creation
   */
  async generateMessage(request: GenerateMessageRequest): Promise<GenerateMessageResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`= Starting SMS message generation${request.caseId ? ` for case ${request.caseId}` : ''}`);
      
      // Step 1: Build the complete prompt using analysis data, message context, and action context
      console.log('= Step 1: Building prompt...');
      const prompt = await BuildPrompt.assemblePrompt({
        analysisData: request.analysisData,
        messageContext: request.messageContext,
        agentConfig: request.agentConfig,
        tenantId: request.tenantId, // NEW: Required for baseline document loading
        caseId: request.caseId,
        actionData: request.actionData, // NEW: Pass action context to prompt building
        isOutbound: request.isOutbound // NEW: Pass outbound flag to prompt building
      });

      console.log(`= Prompt assembled (${prompt.length} characters)`);

      // Step 2: Generate message using Claude LLM
      console.log('= Step 2: Generating message with Claude...');
      
      const messageRequest = {
        prompt,
        maxTokens: request.options?.maxTokens,
        temperature: request.options?.temperature,
        caseId: request.caseId
      };

      const messageResult = request.options?.enableRetry !== false
        ? await CreateMessage.generateMessageWithRetry(messageRequest, request.options?.maxRetries)
        : await CreateMessage.generateMessage(messageRequest);

      if (!messageResult.success) {
        return {
          message: '',
          success: false,
          error: messageResult.error,
          metadata: {
            promptLength: prompt.length,
            messageLength: 0,
            smsPartCount: 0,
            validationWarnings: [],
            processingTime: Date.now() - startTime
          },
          caseId: request.caseId
        };
      }

      // Step 3: Validate the generated message for SMS compatibility
      console.log('= Step 3: Validating SMS message...');
      const validation = CreateMessage.validateSmsMessage(messageResult.message);

      if (!validation.valid) {
        console.warn('= Message validation failed:', validation.warnings);
      } else if (validation.warnings.length > 0) {
        console.warn('= Message validation warnings:', validation.warnings);
      }

      const processingTime = Date.now() - startTime;
      console.log(`= SMS message generation complete (${processingTime}ms)`);
      console.log(`= Generated message: "${messageResult.message}"`);

      return {
        message: messageResult.message,
        success: true,
        metadata: {
          promptLength: prompt.length,
          messageLength: messageResult.message.length,
          smsPartCount: validation.partCount,
          validationWarnings: validation.warnings,
          usage: messageResult.usage,
          processingTime
        },
        caseId: request.caseId
      };

    } catch (error) {
      console.error('Error in SMS message generation:', error);
      
      const processingTime = Date.now() - startTime;
      return {
        message: '',
        success: false,
        error: `Message generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          promptLength: 0,
          messageLength: 0,
          smsPartCount: 0,
          validationWarnings: [],
          processingTime
        },
        caseId: request.caseId
      };
    }
  }

  /**
   * Generate a simple message without full analysis (fallback mode)
   */
  async generateSimpleMessage(
    userMessage: string,
    agentConfig: AgentConfig,
    actionData?: ActionData | null, // NEW: Optional action context
    options?: {
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<GenerateMessageResponse> {
    const startTime = Date.now();
    
    try {
      console.log('= Starting simple SMS message generation (fallback mode)');
      
      // Build simple prompt without analysis but with action context
      const prompt = BuildPrompt.getSimplePrompt(userMessage, agentConfig, actionData);
      
      console.log(`= Simple prompt built (${prompt.length} characters)`);

      // Generate message
      const messageResult = await CreateMessage.generateMessage({
        prompt,
        maxTokens: options?.maxTokens,
        temperature: options?.temperature
      });

      if (!messageResult.success) {
        return {
          message: '',
          success: false,
          error: messageResult.error,
          metadata: {
            promptLength: prompt.length,
            messageLength: 0,
            smsPartCount: 0,
            validationWarnings: [],
            processingTime: Date.now() - startTime
          }
        };
      }

      // Validate message
      const validation = CreateMessage.validateSmsMessage(messageResult.message);
      
      const processingTime = Date.now() - startTime;
      console.log(`= Simple message generation complete (${processingTime}ms)`);

      return {
        message: messageResult.message,
        success: true,
        metadata: {
          promptLength: prompt.length,
          messageLength: messageResult.message.length,
          smsPartCount: validation.partCount,
          validationWarnings: validation.warnings,
          usage: messageResult.usage,
          processingTime
        }
      };

    } catch (error) {
      console.error('Error in simple message generation:', error);
      
      return {
        message: '',
        success: false,
        error: `Simple message generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          promptLength: 0,
          messageLength: 0,
          smsPartCount: 0,
          validationWarnings: [],
          processingTime: Date.now() - startTime
        }
      };
    }
  }
}

export const generateMessage = new GenerateMessage();