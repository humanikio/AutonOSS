import { buildActionSystemPrompt } from './ActionBaseConfig';
import { ActionContext, ActionContextData } from './ActionContext';
import { ActionChatSession, ChatMessage } from './ActionChatManager';

interface PromptBuildOptions {
  includeRecentMessages?: number;
  includeSummary?: boolean;
  maxTokens?: number;
}

export class ActionPromptBuilder {
  private context: ActionContext;
  private contextData: ActionContextData | null = null;

  constructor(tenantId: string, agentId: string, actionId: string) {
    // Handle "new" actions by generating a proper ID
    const processedActionId = actionId === 'new' ? `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : actionId;
    this.context = new ActionContext(tenantId, agentId, processedActionId);
  }

  /**
   * Build a complete prompt for AI interaction
   */
  async buildPrompt(
    session: ActionChatSession,
    userMessage: string,
    options: PromptBuildOptions = {}
  ): Promise<string> {
    try {
      // Load context if not already loaded
      if (!this.contextData) {
        this.contextData = await this.context.loadContext();
      }

      const {
        includeRecentMessages = 10,
        includeSummary = true,
        maxTokens = 100000
      } = options;

      // 1. System prompt
      const systemPrompt = buildActionSystemPrompt(
        this.contextData.agentId,
        this.contextData.currentAction?.prompt
      );

      // 2. Action context
      const contextText = this.context.formatForPrompt(this.contextData);

      // 3. Tool definition
      const toolDefinition = this.getToolDefinition();

      // 4. Conversation history
      const conversationHistory = this.buildConversationHistory(
        session,
        includeRecentMessages,
        includeSummary
      );

      // 5. Current user message
      const currentMessage = `\nUser: ${userMessage}\n\nAssistant:`;

      // Combine all parts
      let fullPrompt = [
        systemPrompt,
        contextText,
        toolDefinition,
        conversationHistory,
        currentMessage
      ].join('\n\n');

      // Trim if too long
      if (this.estimateTokens(fullPrompt) > maxTokens) {
        fullPrompt = this.trimPrompt(fullPrompt, maxTokens);
      }

      return fullPrompt;
    } catch (error) {
      console.error('Error building prompt:', error);
      throw new Error(`Failed to build prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the tool definition for action updates
   */
  private getToolDefinition(): string {
    return `Available Tool:

You have access to the "actionDraftUpdate" tool to update the action draft with your analysis and suggestions.

Tool: actionDraftUpdate
Description: Update the action draft with new information and proposed prompt
Parameters:
- proposedPrompt (string, required): The main LLM-readable action prompt
- understanding (object, required): 
  - summary (string): Brief summary of what the action does
  - behavior (string): Detailed description of expected behavior
  - tone (string): Tone and style of responses
  - keyPoints (array of strings): Key points and constraints
  - confidence (number 0-100): Your confidence in this understanding
- clarifyingQuestion (string, optional): Question to ask user for more details
- suggestions (array of strings, optional): Improvement suggestions

Use this tool whenever you want to update the action draft or propose changes to the prompt.`;
  }

  /**
   * Build conversation history section
   */
  private buildConversationHistory(
    session: ActionChatSession,
    includeRecentMessages: number,
    includeSummary: boolean
  ): string {
    let historyText = 'Conversation History:\n';

    // Add summary if available and requested
    if (includeSummary && session.summary) {
      historyText += `Summary of earlier conversation: ${session.summary}\n\n`;
    }

    // Add recent messages
    const recentMessages = session.messages.slice(-includeRecentMessages);
    if (recentMessages.length > 0) {
      historyText += 'Recent messages:\n';
      recentMessages.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        historyText += `${role}: ${msg.content}\n`;
      });
    } else {
      historyText += 'No previous messages in this session.\n';
    }

    return historyText;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Trim prompt if it's too long
   */
  private trimPrompt(prompt: string, maxTokens: number): string {
    const sections = prompt.split('\n\n');
    let trimmedPrompt = sections[0]; // Always keep system prompt
    let currentTokens = this.estimateTokens(trimmedPrompt);

    // Add sections in priority order until we hit token limit
    const priorityOrder = [1, 2, 4, 3]; // Context, Tools, Current message, History
    
    for (const index of priorityOrder) {
      if (sections[index] && currentTokens < maxTokens * 0.9) {
        const sectionTokens = this.estimateTokens(sections[index]);
        if (currentTokens + sectionTokens < maxTokens) {
          trimmedPrompt += '\n\n' + sections[index];
          currentTokens += sectionTokens;
        }
      }
    }

    return trimmedPrompt;
  }

  /**
   * Refresh context data
   */
  async refreshContext(): Promise<void> {
    this.contextData = await this.context.loadContext();
  }
}