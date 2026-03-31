import { getSystemPrompt } from './baseConfig';
import { documentContextManager, DocumentContext } from './documentContext';
import { chatManager, ChatMessage } from './chatManager';
import { chatSummarizer } from './chatSummarizer';

export interface PromptContext {
  systemPrompt: string;
  documentContext: string;
  conversationHistory: string;
  userMessage: string;
  fullPrompt: string;
}

export class PromptBuilder {
  private readonly MAX_CONTEXT_MESSAGES = 10;

  /**
   * Build complete prompt with all context
   */
  async buildPrompt(
    tenantId: string,
    docId: string,
    chatId: string,
    userMessage: string
  ): Promise<PromptContext> {
    try {
      // Get base system prompt
      const systemPrompt = getSystemPrompt();

      // Load document context
      const documentContext = await this.getDocumentContext(tenantId, docId);

      // Load conversation history
      const conversationHistory = await this.getConversationContext(tenantId, docId, chatId);

      // Assemble full prompt
      const fullPrompt = this.assemblePrompt(
        systemPrompt,
        documentContext.contextPrompt,
        conversationHistory,
        userMessage
      );

      return {
        systemPrompt,
        documentContext: documentContext.contextPrompt,
        conversationHistory,
        userMessage,
        fullPrompt
      };

    } catch (error) {
      console.error('Error building prompt:', error);
      throw new Error('Failed to build prompt context');
    }
  }

  /**
   * Load document context
   */
  async getDocumentContext(tenantId: string, docId: string): Promise<DocumentContext> {
    return await documentContextManager.loadDocumentContext(tenantId, docId);
  }

  /**
   * Load and format conversation history
   */
  private async getConversationContext(
    tenantId: string,
    docId: string,
    chatId: string
  ): Promise<string> {
    try {
      // Load chat session
      const chatSession = await chatManager.loadChatHistory(tenantId, docId, chatId);

      if (!chatSession) {
        return 'This is the start of a new conversation.';
      }

      // Check if we need to use summary
      const shouldUseSummary = chatSession.messageCount > this.MAX_CONTEXT_MESSAGES;

      if (shouldUseSummary && chatSession.summary) {
        // Get recent messages and combine with summary
        const recentMessages = chatSession.messages.slice(-this.MAX_CONTEXT_MESSAGES);
        return await chatSummarizer.createContextSummary(chatSession.summary, recentMessages);
      } else {
        // Use recent messages only
        const recentMessages = chatSession.messages.slice(-this.MAX_CONTEXT_MESSAGES);
        return this.formatMessages(recentMessages);
      }

    } catch (error) {
      console.error('Error loading conversation context:', error);
      return 'Error loading conversation history.';
    }
  }

  /**
   * Format messages for prompt
   */
  private formatMessages(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return 'This is the start of a new conversation.';
    }

    const formattedMessages = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    return `Recent conversation history:\n${formattedMessages}`;
  }

  /**
   * Assemble the complete prompt
   */
  private assemblePrompt(
    systemPrompt: string,
    documentContext: string,
    conversationHistory: string,
    userMessage: string
  ): string {
    return `${systemPrompt}

${documentContext}

${conversationHistory}

Current user message: ${userMessage}

Please provide a helpful response based on the document context and conversation history.`;
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
  isWithinTokenLimit(prompt: string, maxTokens: number = 100000): boolean {
    const estimatedTokens = this.estimateTokenCount(prompt);
    return estimatedTokens <= maxTokens;
  }

  /**
   * Trim prompt if needed
   */
  async trimPromptIfNeeded(
    promptContext: PromptContext,
    maxTokens: number = 100000
  ): Promise<PromptContext> {
    if (this.isWithinTokenLimit(promptContext.fullPrompt, maxTokens)) {
      return promptContext;
    }

    // If too long, reduce conversation history
    const shorterHistory = 'Conversation history truncated due to length.';
    
    const trimmedPrompt = this.assemblePrompt(
      promptContext.systemPrompt,
      promptContext.documentContext,
      shorterHistory,
      promptContext.userMessage
    );

    return {
      ...promptContext,
      conversationHistory: shorterHistory,
      fullPrompt: trimmedPrompt
    };
  }
}

export const promptBuilder = new PromptBuilder();