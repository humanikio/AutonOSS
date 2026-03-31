import { claude4 } from '../../../../llmModels/claude4';
import { SessionMessage } from './sessionManager';

export interface ConversationSummary {
  businessType?: string;
  mainProcess: string;
  keyStages: string[];
  requirements: string[];
  decisionPoints: string[];
  nextSteps: string;
}

export class ConversationSummarizer {
  private readonly SUMMARIZE_AFTER_MESSAGES = 15;

  /**
   * Check if conversation needs summarization
   */
  shouldSummarize(messageCount: number): boolean {
    return messageCount >= this.SUMMARIZE_AFTER_MESSAGES;
  }

  /**
   * Summarize a conversation about pipeline creation
   */
  async summarizeConversation(messages: SessionMessage[]): Promise<ConversationSummary> {
    try {
      // Prepare messages for summarization
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'AI Assistant'}: ${msg.content}`)
        .join('\n\n');

      const summarizationPrompt = `Please analyze the following conversation about creating a sales pipeline and provide a structured summary. 

Focus on extracting:
- Type of business/industry
- Main business process described
- Key stages or steps mentioned
- Specific requirements or constraints
- Decision points in the process
- Next steps or actions needed

Conversation:
${conversationText}

Please respond with a JSON object in this format:
{
  "businessType": "brief description of the business type",
  "mainProcess": "summary of the main business process",
  "keyStages": ["list", "of", "key", "stages", "mentioned"],
  "requirements": ["specific", "requirements", "mentioned"],
  "decisionPoints": ["decision", "points", "identified"],
  "nextSteps": "what needs to happen next"
}`;

      const summaryResponse = await claude4.processText(summarizationPrompt);

      try {
        const parsedSummary = JSON.parse(summaryResponse);
        return {
          businessType: parsedSummary.businessType || 'Unknown',
          mainProcess: parsedSummary.mainProcess || 'Process not clearly defined',
          keyStages: Array.isArray(parsedSummary.keyStages) ? parsedSummary.keyStages : [],
          requirements: Array.isArray(parsedSummary.requirements) ? parsedSummary.requirements : [],
          decisionPoints: Array.isArray(parsedSummary.decisionPoints) ? parsedSummary.decisionPoints : [],
          nextSteps: parsedSummary.nextSteps || 'Continue conversation'
        };
      } catch (parseError) {
        console.error('Error parsing summary JSON:', parseError);
        return this.createFallbackSummary(messages);
      }

    } catch (error) {
      console.error('Error summarizing conversation:', error);
      return this.createFallbackSummary(messages);
    }
  }

  /**
   * Create a context summary for prompt building
   */
  async createContextSummary(
    previousSummary: ConversationSummary | undefined,
    recentMessages: SessionMessage[]
  ): Promise<string> {
    try {
      if (!previousSummary && recentMessages.length === 0) {
        return 'No previous conversation context.';
      }

      let contextParts: string[] = [];

      if (previousSummary) {
        contextParts.push(`Previous Conversation Summary:
Business Type: ${previousSummary.businessType}
Main Process: ${previousSummary.mainProcess}
Key Stages Discussed: ${previousSummary.keyStages.join(', ')}
Requirements: ${previousSummary.requirements.join(', ')}
Decision Points: ${previousSummary.decisionPoints.join(', ')}
Next Steps: ${previousSummary.nextSteps}`);
      }

      if (recentMessages.length > 0) {
        const recentConversation = recentMessages
          .map(msg => `${msg.role === 'user' ? 'User' : 'AI Assistant'}: ${msg.content}`)
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
   * Create a simple summary when AI parsing fails
   */
  private createFallbackSummary(messages: SessionMessage[]): ConversationSummary {
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    // Extract basic info from user messages
    const allText = userMessages.map(msg => msg.content.toLowerCase()).join(' ');
    
    // Simple keyword detection
    const businessTypes = {
      'real estate': /real estate|property|listing|house|home/,
      'agency': /agency|marketing|client|campaign/,
      'saas': /software|saas|subscription|platform/,
      'consulting': /consulting|consultant|service|advice/,
      'retail': /retail|store|product|customer/,
      'manufacturing': /manufacturing|production|supply/
    };

    let detectedBusinessType = 'Unknown Business';
    for (const [type, regex] of Object.entries(businessTypes)) {
      if (regex.test(allText)) {
        detectedBusinessType = type;
        break;
      }
    }

    return {
      businessType: detectedBusinessType,
      mainProcess: lastUserMessage?.content.substring(0, 100) + '...' || 'Process description not available',
      keyStages: [],
      requirements: [],
      decisionPoints: [],
      nextSteps: 'Continue gathering requirements for pipeline creation'
    };
  }

  /**
   * Extract key business terms from conversation
   */
  extractBusinessTerms(messages: SessionMessage[]): string[] {
    const text = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ')
      .toLowerCase();

    // Common business process terms
    const businessTerms = [
      'lead', 'prospect', 'inquiry', 'contact', 'qualification', 'demo', 'proposal', 
      'negotiation', 'contract', 'closing', 'follow-up', 'onboarding', 'client',
      'customer', 'meeting', 'call', 'presentation', 'approval', 'decision'
    ];

    return businessTerms.filter(term => text.includes(term));
  }
}

export const conversationSummarizer = new ConversationSummarizer();