import Claude4Model from '../../../llmModels/claude4';
import { ChatMessage } from './chatManager';

export class ChatSummarizer {
  private claude4Service: Claude4Model;
  private readonly SUMMARIZE_AFTER_MESSAGES = 30;

  constructor() {
    this.claude4Service = new Claude4Model();
  }

  /**
   * Check if chat needs summarization
   */
  shouldSummarize(messageCount: number): boolean {
    return messageCount >= this.SUMMARIZE_AFTER_MESSAGES;
  }

  /**
   * Summarize a conversation
   */
  async summarizeConversation(messages: ChatMessage[]): Promise<string> {
    try {
      // Prepare messages for summarization
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      const summarizationPrompt = `Please provide a concise summary of the following conversation about a knowledge base document. 
Focus on:
- Main topics discussed
- Key suggestions or improvements made
- Important decisions or changes agreed upon
- Any action items or next steps

Conversation:
${conversationText}

Summary:`;

      const summary = await this.claude4Service.processText(summarizationPrompt);

      return summary;

    } catch (error) {
      console.error('Error summarizing conversation:', error);
      throw new Error('Failed to summarize conversation');
    }
  }

  /**
   * Create a context summary for prompt building
   */
  async createContextSummary(
    previousSummary: string | undefined,
    recentMessages: ChatMessage[]
  ): Promise<string> {
    try {
      if (!previousSummary && recentMessages.length === 0) {
        return 'No previous conversation context.';
      }

      let contextParts: string[] = [];

      if (previousSummary) {
        contextParts.push(`Previous Conversation Summary:\n${previousSummary}`);
      }

      if (recentMessages.length > 0) {
        const recentConversation = recentMessages
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n');
        
        contextParts.push(`Recent Messages:\n${recentConversation}`);
      }

      return contextParts.join('\n\n');

    } catch (error) {
      console.error('Error creating context summary:', error);
      return 'Error loading conversation context.';
    }
  }

  /**
   * Extract key points from a summary for quick reference
   */
  extractKeyPoints(summary: string): string[] {
    // Simple extraction - in production, this could use NLP
    const lines = summary.split('\n');
    const keyPoints: string[] = [];

    for (const line of lines) {
      // Look for bullet points or numbered items
      if (line.match(/^[-"*]|\d+\./)) {
        keyPoints.push(line.trim());
      }
    }

    return keyPoints.slice(0, 5); // Return top 5 key points
  }
}

export const chatSummarizer = new ChatSummarizer();