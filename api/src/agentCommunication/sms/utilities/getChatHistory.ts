import { contactOverviewOrchestrator } from '../../../universalContactMemory/ochestrators/contactOverviewOcrhestrator';

/**
 * Utility for fetching conversation history in SMS agent communication
 * Integrates with the universal contact memory system for conversational context
 */

export interface ChatHistoryRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageLimit?: number; // Default: 15
  isTraining?: boolean; // Flag to indicate training mode
  trainingSessionId?: string; // Training session ID if applicable
  excludeCurrentMessage?: boolean; // NEW: Exclude current message from history
  currentMessageId?: string; // NEW: ID of current message to exclude
}

export interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  timestamp: FirebaseFirestore.Timestamp;
  isFromAgent: boolean;
  agentId?: string;
  fromPhone: string;
  toPhone: string;
}

export interface ChatHistoryResult {
  success: boolean;
  conversationHistory?: {
    messages: ConversationMessage[];
    summary?: string;
    totalMessages: number;
    hasMoreHistory: boolean;
    conversationalContext: string; // Formatted for prompt use
  };
  contactProfile?: {
    profileId: string;
    profileText: string;
    isEmpty: boolean;
    lastUpdated: FirebaseFirestore.Timestamp;
  };
  promptContext?: {
    contactProfileSection: string;
    conversationHistorySection: string;
  };
  error?: string;
}

export class GetChatHistory {
  /**
   * Fetch conversation history for SMS agent processing
   * Returns formatted history suitable for conversational AI context
   */
  async getChatHistory(request: ChatHistoryRequest): Promise<ChatHistoryResult> {
    try {
      console.log('📚 Fetching complete contact overview (profile + history) for SMS agent processing');
      console.log(`  - Mode: ${request.isTraining ? 'Training' : 'Production'}`);
      console.log(`  - Conversation ID: ${request.conversationId}`);
      console.log(`  - Contact ID: ${request.contactId}`);
      console.log(`  - Message Limit: ${request.messageLimit || 15}`);

      // Use the new Contact Overview Orchestrator - gets profile + history in one call
      const overviewResult = await contactOverviewOrchestrator.getContactOverview({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        sessionId: request.trainingSessionId,
        messageLimit: request.messageLimit || 15,
        isTraining: request.isTraining || false
      });

      if (!overviewResult.success || !overviewResult.data) {
        console.error('❌ Failed to fetch contact overview:', overviewResult.error);
        return {
          success: false,
          error: overviewResult.error || 'Failed to fetch contact overview'
        };
      }

      console.log(`  ✅ Contact overview retrieved successfully`);
      console.log(`  📋 Profile: ${overviewResult.data.contactProfile.isEmpty ? 'Empty' : 'Populated'} (${overviewResult.data.contactProfile.profileText.length} chars)`);
      console.log(`  💬 History: ${overviewResult.data.conversationHistory.messages.length} messages`);
      console.log(`  📊 Total messages: ${overviewResult.data.conversationHistory.totalMessages}`);
      console.log(`  📝 Has summary: ${!!overviewResult.data.conversationHistory.summary}`);

      // Transform orchestrator messages to local ConversationMessage format
      let conversationMessages: ConversationMessage[] = overviewResult.data.conversationHistory.messages.map(msg => ({
        id: msg.id,
        direction: msg.direction,
        body: msg.body,
        timestamp: msg.timestamp,
        isFromAgent: msg.isFromAgent,
        agentId: msg.agentId,
        fromPhone: msg.fromPhone,
        toPhone: msg.toPhone
      }));

      // Filter out current message if requested
      if (request.excludeCurrentMessage && request.currentMessageId) {
        const originalCount = conversationMessages.length;
        conversationMessages = conversationMessages.filter(msg =>
          msg.id !== request.currentMessageId
        );
        console.log(`  🔍 Filtered current message: ${originalCount} -> ${conversationMessages.length} messages`);
      }

      // Build conversational context (similar to before, but now including profile info)
      const conversationalContext = this.buildConversationalContext(
        conversationMessages,
        overviewResult.data.conversationHistory.summary,
        overviewResult.data.conversationHistory.hasMoreHistory
      );

      console.log(`  🗣️ Conversational context prepared (${conversationalContext.length} chars)`);

      // Debug logging for training mode
      if (request.isTraining && conversationMessages.length > 0) {
        console.log(`  🔍 DEBUG: Training session messages:`);
        conversationMessages.forEach((msg, index) => {
          console.log(`    ${index + 1}. [${msg.direction}] ${msg.body.substring(0, 100)}${msg.body.length > 100 ? '...' : ''}`);
        });
      }

      return {
        success: true,
        conversationHistory: {
          messages: conversationMessages,
          summary: overviewResult.data.conversationHistory.summary,
          totalMessages: overviewResult.data.conversationHistory.totalMessages,
          hasMoreHistory: overviewResult.data.conversationHistory.hasMoreHistory,
          conversationalContext
        },
        contactProfile: overviewResult.data.contactProfile,
        promptContext: overviewResult.data.promptContext
      };

    } catch (error) {
      console.error('❌ Error fetching contact overview for SMS agent:', error);

      return {
        success: false,
        error: `Failed to fetch contact overview: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build conversational context string optimized for AI prompts
   * Creates a natural narrative of the conversation history
   */
  private buildConversationalContext(
    messages: ConversationMessage[],
    summary?: string,
    hasMoreHistory: boolean = false
  ): string {
    // Handle truly new conversations - no messages or only current user message
    if (messages.length === 0 && !summary) {
      return 'This is the start of a new conversation with this customer.';
    }
    
    // CRITICAL FIX: If we only have 1 message and no agent messages, this is a new conversation
    if (messages.length === 1 && !messages.some(m => m.isFromAgent) && !summary) {
      return 'This is the start of a new conversation with this customer.';
    }

    let context = '';

    // Add summary context if available
    if (summary) {
      context += `PREVIOUS CONVERSATION SUMMARY:\n${summary}\n\n`;
      
      if (hasMoreHistory) {
        context += `NOTE: There is additional conversation history beyond what's summarized above.\n\n`;
      }
    }

    // Add recent conversation context
    if (messages.length > 0) {
      context += summary ? 'RECENT CONVERSATION:\n' : 'CONVERSATION HISTORY:\n';
      
      messages.forEach((msg, index) => {
        const timeAgo = this.getTimeAgoDescription(msg.timestamp);
        const participant = msg.isFromAgent ? 
          `You (Agent${msg.agentId ? ` ${msg.agentId}` : ''})` : 
          'Customer';
        
        context += `${participant} (${timeAgo}): ${msg.body}\n`;
      });

      // Add conversational flow indicators
      const lastMessage = messages[messages.length - 1];
      const isLastMessageFromCustomer = !lastMessage.isFromAgent;
      
      context += `\nCONVERSATIONAL CONTEXT:\n`;
      context += `- Total messages in conversation: ${messages.length}\n`;
      context += `- Last message was from: ${isLastMessageFromCustomer ? 'Customer' : 'Agent'}\n`;
      
      if (isLastMessageFromCustomer) {
        context += `- Customer is waiting for your response\n`;
      } else {
        context += `- Your last response was sent, customer has replied\n`;
      }

      // Identify conversation patterns
      const customerMessages = messages.filter(m => !m.isFromAgent);
      const agentMessages = messages.filter(m => m.isFromAgent);
      
      if (agentMessages.length > 0) {
        context += `- This is an ONGOING conversation (not first contact)\n`;
        context += `- Be conversational and reference previous discussion naturally\n`;
        context += `- Customer messages: ${customerMessages.length}, Agent messages: ${agentMessages.length}\n`;
      } else {
        context += `- This appears to be the customer's first message in this conversation\n`;
      }
    }

    return context;
  }

  /**
   * Get human-readable time description
   */
  private getTimeAgoDescription(timestamp: FirebaseFirestore.Timestamp): string {
    const now = Date.now();
    const messageTime = timestamp.toMillis();
    const diffMinutes = Math.round((now - messageTime) / (1000 * 60));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return timestamp.toDate().toLocaleDateString();
  }

  /**
   * Get conversation metadata for analytics
   */
  async getConversationMetadata(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{
    success: boolean;
    metadata?: {
      messageCount: number;
      lastActivityTime: FirebaseFirestore.Timestamp;
      conversationAge: number; // minutes since first message
      agentParticipation: boolean;
      averageResponseTime?: number; // minutes
    };
    error?: string;
  }> {
    try {
      const historyResult = await this.getChatHistory({
        tenantId,
        contactId,
        conversationId,
        messageLimit: 50 // Get more messages for better analytics
      });

      if (!historyResult.success || !historyResult.conversationHistory) {
        return {
          success: false,
          error: historyResult.error || 'No conversation data available'
        };
      }

      const messages = historyResult.conversationHistory.messages;
      if (messages.length === 0) {
        return {
          success: true,
          metadata: {
            messageCount: 0,
            lastActivityTime: new Date() as any,
            conversationAge: 0,
            agentParticipation: false
          }
        };
      }

      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const agentMessages = messages.filter(m => m.isFromAgent);
      
      const conversationAge = Math.round(
        (Date.now() - firstMessage.timestamp.toMillis()) / (1000 * 60)
      );

      // Calculate average response time (simplified)
      let totalResponseTime = 0;
      let responseCount = 0;
      
      for (let i = 1; i < messages.length; i++) {
        const currentMsg = messages[i];
        const prevMsg = messages[i - 1];
        
        // If this is a response to previous message from different participant
        if (currentMsg.isFromAgent !== prevMsg.isFromAgent) {
          const responseTime = (currentMsg.timestamp.toMillis() - prevMsg.timestamp.toMillis()) / (1000 * 60);
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : undefined;

      return {
        success: true,
        metadata: {
          messageCount: messages.length,
          lastActivityTime: lastMessage.timestamp,
          conversationAge,
          agentParticipation: agentMessages.length > 0,
          averageResponseTime
        }
      };

    } catch (error) {
      console.error('Error getting conversation metadata:', error);
      
      return {
        success: false,
        error: `Failed to get conversation metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const getChatHistory = new GetChatHistory();