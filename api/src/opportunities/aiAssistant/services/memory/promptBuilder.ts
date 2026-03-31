import { getSystemPrompt } from './baseConfig';
import { pipelineContextManager, PipelineContext } from './pipelineContext';
import { sessionManager, SessionMessage } from './sessionManager';
import { conversationSummarizer, ConversationSummary } from './conversationSummarizer';

export interface PromptContext {
  systemPrompt: string;
  pipelineContext: string;
  conversationHistory: string;
  userMessage: string;
  fullPrompt: string;
  metadata: {
    messageCount: number;
    stagesGenerated: boolean;
    pipelineType: 'new' | 'existing';
  };
}

export class PromptBuilder {
  private readonly MAX_CONTEXT_MESSAGES = 8;
  private readonly MAX_TOKENS = 100000;

  /**
   * Build complete prompt with all context for prompt analysis
   */
  async buildPromptAnalysisContext(
    tenantId: string,
    sessionId: string,
    userMessage: string
  ): Promise<PromptContext> {
    try {
      // Get base system prompt
      const systemPrompt = getSystemPrompt();

      // Load pipeline context
      const pipelineContext = await this.getPipelineContext(tenantId, sessionId);

      // Load conversation history
      const conversationHistory = await this.getConversationContext(tenantId, sessionId);

      // Get metadata
      const metadata = await this.getSessionMetadata(tenantId, sessionId);

      // Assemble full prompt
      const fullPrompt = this.assemblePrompt(
        systemPrompt,
        pipelineContext.contextPrompt,
        conversationHistory,
        userMessage
      );

      return {
        systemPrompt,
        pipelineContext: pipelineContext.contextPrompt,
        conversationHistory,
        userMessage,
        fullPrompt,
        metadata
      };

    } catch (error) {
      console.error('Error building prompt context:', error);
      throw new Error('Failed to build prompt context');
    }
  }

  /**
   * Build context specifically for stage generation
   */
  async buildStageGenerationContext(
    tenantId: string,
    sessionId: string,
    userMessage: string,
    previousAnalysis: any
  ): Promise<PromptContext> {
    try {
      // Enhanced system prompt for stage generation
      const systemPrompt = this.getStageGenerationSystemPrompt();

      // Load pipeline context with stage analysis
      const pipelineContext = await this.getEnhancedPipelineContext(tenantId, sessionId);

      // Load conversation history focused on business process
      const conversationHistory = await this.getBusinessProcessContext(tenantId, sessionId);

      // Get metadata
      const metadata = await this.getSessionMetadata(tenantId, sessionId);

      // Include previous analysis
      const analysisContext = `PREVIOUS ANALYSIS:\n${previousAnalysis.response}\n\n`;

      // Assemble full prompt for stage generation
      const fullPrompt = `${systemPrompt}

${pipelineContext}

${analysisContext}${conversationHistory}

Current user message: ${userMessage}

Based on the conversation and business process described, generate specific pipeline stages that represent the customer journey and key decision points.`;

      return {
        systemPrompt,
        pipelineContext,
        conversationHistory: analysisContext + conversationHistory,
        userMessage,
        fullPrompt,
        metadata
      };

    } catch (error) {
      console.error('Error building stage generation context:', error);
      throw new Error('Failed to build stage generation context');
    }
  }

  /**
   * Load pipeline context
   */
  async getPipelineContext(tenantId: string, sessionId: string): Promise<PipelineContext> {
    return await pipelineContextManager.loadPipelineContext(tenantId, sessionId);
  }

  /**
   * Get enhanced pipeline context for stage generation
   */
  private async getEnhancedPipelineContext(tenantId: string, sessionId: string): Promise<string> {
    const context = await this.getPipelineContext(tenantId, sessionId);
    const stageAnalysis = pipelineContextManager.analyzeExistingStages(context.existingStages);
    
    let enhancedContext = context.contextPrompt;
    
    if (stageAnalysis.missingCommonStages.length > 0) {
      enhancedContext += `\n\nSTAGE ANALYSIS:
- Missing Common Stages: ${stageAnalysis.missingCommonStages.join(', ')}
- Has Qualification Stage: ${stageAnalysis.hasQualificationStage}
- Has Proposal Stage: ${stageAnalysis.hasProposalStage}
- Has Closing Stage: ${stageAnalysis.hasClosingStage}`;
    }

    const guidance = pipelineContextManager.getPipelineGuidance(context.existingStages);
    enhancedContext += `\n\nGUIDANCE: ${guidance}`;

    return enhancedContext;
  }

  /**
   * Load and format conversation history
   */
  private async getConversationContext(
    tenantId: string,
    sessionId: string
  ): Promise<string> {
    try {
      // Get message count
      const messageCount = await sessionManager.getMessageCount(tenantId, sessionId);

      // Check if we need to use summary
      const shouldUseSummary = conversationSummarizer.shouldSummarize(messageCount);

      if (shouldUseSummary) {
        // Get all messages for summarization and recent messages for context
        const allMessages = await sessionManager.getRecentMessages(tenantId, sessionId, messageCount);
        const recentMessages = await sessionManager.getRecentMessages(tenantId, sessionId, this.MAX_CONTEXT_MESSAGES);
        
        // Create summary of older messages
        const olderMessages = allMessages.slice(0, -this.MAX_CONTEXT_MESSAGES);
        let summary: ConversationSummary | undefined;
        
        if (olderMessages.length > 0) {
          summary = await conversationSummarizer.summarizeConversation(olderMessages);
        }
        
        return await conversationSummarizer.createContextSummary(summary, recentMessages);
      } else {
        // Use recent messages only
        const recentMessages = await sessionManager.getRecentMessages(tenantId, sessionId, this.MAX_CONTEXT_MESSAGES);
        return this.formatMessages(recentMessages);
      }

    } catch (error) {
      console.error('Error loading conversation context:', error);
      return 'Error loading conversation history.';
    }
  }

  /**
   * Get business process focused context
   */
  private async getBusinessProcessContext(tenantId: string, sessionId: string): Promise<string> {
    const recentMessages = await sessionManager.getRecentMessages(tenantId, sessionId, this.MAX_CONTEXT_MESSAGES);
    const businessTerms = conversationSummarizer.extractBusinessTerms(recentMessages);
    
    let context = this.formatMessages(recentMessages);
    
    if (businessTerms.length > 0) {
      context += `\n\nIDENTIFIED BUSINESS TERMS: ${businessTerms.join(', ')}`;
    }
    
    return context;
  }

  /**
   * Format messages for prompt
   */
  private formatMessages(messages: SessionMessage[]): string {
    if (messages.length === 0) {
      return 'This is the start of a new conversation.';
    }

    const formattedMessages = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'AI Assistant'}: ${msg.content}`)
      .join('\n\n');

    return `Conversation History:\n${formattedMessages}`;
  }

  /**
   * Get session metadata
   */
  private async getSessionMetadata(tenantId: string, sessionId: string): Promise<{
    messageCount: number;
    stagesGenerated: boolean;
    pipelineType: 'new' | 'existing';
  }> {
    const sessionContext = await sessionManager.getSessionContext(tenantId, sessionId);
    const messageCount = await sessionManager.getMessageCount(tenantId, sessionId);
    
    return {
      messageCount,
      stagesGenerated: sessionContext.stagesGenerated,
      pipelineType: sessionContext.existingStages.length > 0 ? 'existing' : 'new'
    };
  }

  /**
   * Get enhanced system prompt for stage generation
   */
  private getStageGenerationSystemPrompt(): string {
    return `You are an expert sales pipeline consultant specialized in creating optimized pipeline stages. Your goal is to design stages that:

1. Represent clear, actionable steps in the sales process
2. Capture key decision points where deals progress or are lost
3. Are practical for sales teams to use and understand
4. Follow logical business process flow
5. Consider industry-specific requirements

When generating stages:
- Use clear, business-friendly names
- Order stages from initial contact to final conversion
- Consider the customer's perspective and journey
- Include qualification, evaluation, and decision stages
- Account for any approval processes or multiple decision makers
- Ensure stages are neither too granular nor too broad

You must respond with a JSON object containing stages and explanation as specified in your instructions.`;
  }

  /**
   * Assemble the complete prompt
   */
  private assemblePrompt(
    systemPrompt: string,
    pipelineContext: string,
    conversationHistory: string,
    userMessage: string
  ): string {
    return `${systemPrompt}

${pipelineContext}

${conversationHistory}

Current user message: ${userMessage}

Please analyze this message and respond according to your instructions.`;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if prompt is within token limits
   */
  isWithinTokenLimit(prompt: string): boolean {
    const estimatedTokens = this.estimateTokenCount(prompt);
    return estimatedTokens <= this.MAX_TOKENS;
  }

  /**
   * Trim prompt if needed
   */
  async trimPromptIfNeeded(promptContext: PromptContext): Promise<PromptContext> {
    if (this.isWithinTokenLimit(promptContext.fullPrompt)) {
      return promptContext;
    }

    // If too long, reduce conversation history
    const shorterHistory = 'Conversation history truncated due to length. Focus on the current user message.';
    
    const trimmedPrompt = this.assemblePrompt(
      promptContext.systemPrompt,
      promptContext.pipelineContext,
      shorterHistory,
      promptContext.userMessage
    );

    console.log('⚠️ Prompt trimmed due to length limits');

    return {
      ...promptContext,
      conversationHistory: shorterHistory,
      fullPrompt: trimmedPrompt
    };
  }
}

export const promptBuilder = new PromptBuilder();