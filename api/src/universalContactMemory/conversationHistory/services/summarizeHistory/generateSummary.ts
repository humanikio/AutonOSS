import { claude4 } from '../../../../llmModels/claude4';
import { Message } from '../getConversationHistory/pullLatestMessages';

/**
 * Sub-module for generating conversation summaries using Claude 4
 * Creates intelligent, contextual summaries of conversation history
 */

export interface GenerateSummaryRequest {
  messages: Message[];
  existingSummary?: string | null;
  conversationId?: string;
}

export interface GenerateSummaryResult {
  success: boolean;
  summary: string;
  summaryLength: number;
  messagesAnalyzed: number;
  error?: string;
}

export class GenerateSummary {
  /**
   * Generate conversation summary using Claude 4
   * Creates comprehensive summary incorporating existing summary if available
   */
  async createSummary(request: GenerateSummaryRequest): Promise<GenerateSummaryResult> {
    try {
      console.log(`= Generating summary with Claude 4`);
      console.log(`  - Messages to analyze: ${request.messages.length}`);
      console.log(`  - Has existing summary: ${!!request.existingSummary}`);

      if (request.messages.length === 0) {
        return {
          success: true,
          summary: '',
          summaryLength: 0,
          messagesAnalyzed: 0
        };
      }

      // Build the prompt for Claude 4
      const prompt = this.buildSummarizationPrompt(request.messages, request.existingSummary);
      console.log(`  - Prompt length: ${prompt.length} characters`);

      // Generate summary using Claude 4
      console.log(`  🤖 Calling Claude 4 for summarization...`);
      const summary = await claude4.processText(prompt);

      console.log(`  ✅ Summary generated successfully`);
      console.log(`    - Summary length: ${summary.length} characters`);

      return {
        success: true,
        summary: summary.trim(),
        summaryLength: summary.trim().length,
        messagesAnalyzed: request.messages.length
      };

    } catch (error) {
      console.error('❌ Error generating summary with Claude 4:', error);
      
      return {
        success: false,
        summary: '',
        summaryLength: 0,
        messagesAnalyzed: request.messages.length,
        error: `Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build the summarization prompt for Claude 4
   */
  private buildSummarizationPrompt(messages: Message[], existingSummary?: string | null): string {
    const systemContext = `You are an expert at creating concise, accurate conversation summaries for customer service interactions. Your goal is to create a comprehensive summary that captures:

1. Key topics and issues discussed
2. Customer concerns and requests
3. Agent responses and solutions provided
4. Important outcomes or resolutions
5. Any follow-up actions needed

Guidelines:
- Be concise but comprehensive
- Focus on actionable information and outcomes
- Maintain chronological flow when relevant
- Highlight unresolved issues
- Use clear, professional language
- Aim for 150-300 words for the complete summary`;

    let conversationContext = '';
    
    // Add existing summary context if available
    if (existingSummary) {
      conversationContext = `EXISTING CONVERSATION SUMMARY:
${existingSummary}

---

RECENT CONVERSATION MESSAGES (to be integrated with existing summary):`;
    } else {
      conversationContext = `CONVERSATION MESSAGES TO SUMMARIZE:`;
    }

    // Format messages for analysis
    const formattedMessages = messages.map((message, index) => {
      const timestamp = message.created_at.toDate().toLocaleString();
      const participantType = message.agent_id ? 'Agent' : 'Customer';
      const participant = message.agent_id ? `Agent (${message.agent_id})` : `Customer (${message.from_norm})`;
      
      return `${index + 1}. [${timestamp}] ${participant} (${message.direction}):
${message.body}`;
    }).join('\n\n');

    const taskInstructions = existingSummary
      ? `Please create an updated comprehensive summary that integrates the existing summary with the new messages. Focus on:
1. Updating the timeline with new developments
2. Adding any new topics or issues that emerged
3. Updating resolution status of previously mentioned issues
4. Maintaining the overall narrative flow
5. Keeping the summary concise while being complete

Return only the updated complete summary, not separate sections.`
      : `Please create a comprehensive summary of this conversation that captures the key points, issues, and outcomes. Focus on what would be most useful for someone reviewing this conversation later.

Return only the summary, no additional commentary.`;

    const fullPrompt = `${systemContext}

${conversationContext}

${formattedMessages}

${taskInstructions}`;

    return fullPrompt;
  }

  /**
   * Generate a quick summary for testing or preview purposes
   */
  async generateQuickSummary(
    messages: Message[],
    maxLength: number = 100
  ): Promise<{ success: boolean; summary: string; error?: string }> {
    try {
      console.log(`= Generating quick summary (max ${maxLength} chars)`);

      if (messages.length === 0) {
        return { success: true, summary: 'No messages to summarize' };
      }

      // Simple prompt for quick summary
      const quickPrompt = `Summarize this conversation in ${maxLength} characters or less. Focus on the main topic and outcome:

${messages.map(m => `${m.agent_id ? 'Agent' : 'Customer'}: ${m.body}`).join('\n')}

Summary (${maxLength} chars max):`;

      const summary = await claude4.processText(quickPrompt);
      const trimmedSummary = summary.trim().substring(0, maxLength);

      return {
        success: true,
        summary: trimmedSummary
      };

    } catch (error) {
      console.error('Error generating quick summary:', error);
      
      return {
        success: false,
        summary: '',
        error: `Quick summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract key topics from messages for categorization
   */
  async extractKeyTopics(messages: Message[]): Promise<{
    success: boolean;
    topics: string[];
    error?: string;
  }> {
    try {
      console.log(`= Extracting key topics from ${messages.length} messages`);

      if (messages.length === 0) {
        return { success: true, topics: [] };
      }

      const topicsPrompt = `Analyze this conversation and extract 3-5 key topics or categories that best describe what was discussed. Return only the topics, one per line:

${messages.map(m => m.body).join('\n')}

Key Topics:`;

      const response = await claude4.processText(topicsPrompt);
      const topics = response.trim()
        .split('\n')
        .map(topic => topic.replace(/^[-•*]\s*/, '').trim())
        .filter(topic => topic.length > 0);

      console.log(`  Extracted ${topics.length} topics:`, topics);

      return {
        success: true,
        topics
      };

    } catch (error) {
      console.error('Error extracting key topics:', error);
      
      return {
        success: false,
        topics: [],
        error: `Topic extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const generateSummary = new GenerateSummary();