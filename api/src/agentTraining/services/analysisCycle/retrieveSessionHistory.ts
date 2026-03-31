import { getTrainingChatService } from '../../../agentCommunication/trainingChatManager/services/getTrainingChat';
import { getConversationHistoryService } from '../../../universalContactMemory/conversationHistory/services/getConversationHistory';

/**
 * Service for retrieving training session history for analysis
 * Uses existing training chat manager and universal contact memory systems
 */

export interface SessionHistoryRequest {
  sessionId: string;
  tenantId: string;
  messageLimit?: number;
}

export interface SessionMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    agentId?: string;
    ragNeeded?: boolean;
    ragUsed?: boolean;
    documentsUsed?: number;
    processingTime?: number;
    analysisId?: string;
    caseId?: string;
  };
}

export interface SessionHistoryResult {
  success: boolean;
  sessionId?: string;
  messages?: SessionMessage[];
  conversationalContext?: string;
  summary?: string;
  sessionInfo?: {
    agentId: string;
    status: string;
    startedAt: string;
    messageCount: number;
  };
  error?: string;
}

export class RetrieveSessionHistoryService {
  /**
   * Get comprehensive training session history using existing services
   */
  async getSessionHistory(request: SessionHistoryRequest): Promise<SessionHistoryResult> {
    try {
      const { sessionId, tenantId, messageLimit = 50 } = request;
      
      console.log(`=� Retrieving training session history: ${sessionId}`);
      console.log(`  - Message limit: ${messageLimit}`);

      // Step 1: Get training session messages using existing service
      console.log('  " Step 1: Fetching training session messages...');
      const trainingResult = await getTrainingChatService.getSessionMessages({
        tenantId,
        sessionId,
        limit: messageLimit
      });

      if (!trainingResult.success) {
        console.error('L Failed to fetch training session messages:', trainingResult.error);
        return {
          success: false,
          error: trainingResult.error
        };
      }

      console.log(`   Found ${trainingResult.messages?.length || 0} training messages`);

      // Step 2: Get formatted conversation history using universal contact memory
      console.log('  " Step 2: Formatting conversation context...');
      const conversationResult = await getConversationHistoryService.getHistory({
        tenantId,
        sessionId,
        messageLimit,
        isTraining: true // Use training mode
      });

      let conversationalContext = '';
      let summary = undefined;

      if (conversationResult.success && conversationResult.data) {
        // Build conversational context from training messages
        const messages = conversationResult.data.messages;
        
        conversationalContext = 'Training Conversation History:\n\n';
        messages.forEach((msg, index) => {
          const role = msg.direction === 'inbound' ? 'User' : 'Agent';
          conversationalContext += `${role}: ${msg.body}\n`;
          if (index < messages.length - 1) {
            conversationalContext += '\n';
          }
        });

        summary = conversationResult.data.summary;
        console.log(`   Built conversation context (${conversationalContext.length} chars)`);
        console.log(`   Summary available: ${summary ? 'Yes' : 'No'}`);
      } else {
        console.warn('  � Could not format conversation context, using basic format');
        
        // Fallback: build simple context from training messages
        if (trainingResult.messages) {
          conversationalContext = 'Training Conversation History:\n\n';
          trainingResult.messages.forEach((msg, index) => {
            const role = msg.sender === 'user' ? 'User' : 'Agent';
            conversationalContext += `${role}: ${msg.content}\n`;
            if (index < (trainingResult.messages?.length || 0) - 1) {
              conversationalContext += '\n';
            }
          });
        }
      }

      // Step 3: Format messages for analysis
      console.log('  " Step 3: Formatting messages for analysis...');
      const formattedMessages: SessionMessage[] = trainingResult.messages?.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: {
          agentId: msg.metadata?.agentId,
          ragNeeded: msg.metadata?.ragNeeded || msg.metadata?.ragUsed,
          ragUsed: msg.metadata?.ragUsed,
          documentsUsed: msg.metadata?.documentsUsed,
          processingTime: msg.metadata?.processingTime,
          analysisId: msg.metadata?.analysisId,
          caseId: msg.metadata?.caseId
        }
      })) || [];

      // Step 4: Analyze conversation patterns for additional context
      console.log('  " Step 4: Analyzing conversation patterns...');
      const userMessages = formattedMessages.filter(m => m.sender === 'user');
      const agentMessages = formattedMessages.filter(m => m.sender === 'agent');
      const messagesWithRAG = formattedMessages.filter(m => m.metadata?.ragUsed);
      
      // Look for user correction patterns
      const potentialCorrections = userMessages.filter(msg => {
        const content = msg.content.toLowerCase();
        return content.includes('no') || 
               content.includes('wrong') || 
               content.includes('incorrect') || 
               content.includes('actually') || 
               content.includes('should be') ||
               content.includes('better') ||
               content.includes('instead');
      });

      console.log(`  =� Analysis patterns detected:`);
      console.log(`    - Total messages: ${formattedMessages.length}`);
      console.log(`    - User messages: ${userMessages.length}`);
      console.log(`    - Agent messages: ${agentMessages.length}`);
      console.log(`    - Messages with RAG: ${messagesWithRAG.length}`);
      console.log(`    - Potential corrections: ${potentialCorrections.length}`);

      const result: SessionHistoryResult = {
        success: true,
        sessionId,
        messages: formattedMessages,
        conversationalContext,
        summary,
        sessionInfo: trainingResult.sessionInfo
      };

      console.log(' Training session history retrieved successfully');
      
      return result;

    } catch (error) {
      console.error('L Error retrieving session history:', error);
      
      return {
        success: false,
        error: `Failed to retrieve session history: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract user feedback and correction patterns from conversation
   */
  private extractUserFeedback(messages: SessionMessage[]): {
    corrections: string[];
    feedback: string[];
    suggestions: string[];
  } {
    const corrections: string[] = [];
    const feedback: string[] = [];
    const suggestions: string[] = [];

    const userMessages = messages.filter(m => m.sender === 'user');

    userMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Detect corrections
      if (content.includes('no') || content.includes('wrong') || content.includes('incorrect')) {
        corrections.push(msg.content);
      }
      
      // Detect feedback
      if (content.includes('good') || content.includes('bad') || content.includes('better') || content.includes('worse')) {
        feedback.push(msg.content);
      }
      
      // Detect suggestions
      if (content.includes('should') || content.includes('could') || content.includes('try') || content.includes('instead')) {
        suggestions.push(msg.content);
      }
    });

    return { corrections, feedback, suggestions };
  }
}

export const retrieveSessionHistoryService = new RetrieveSessionHistoryService();