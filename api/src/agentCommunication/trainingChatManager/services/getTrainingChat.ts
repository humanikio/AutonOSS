import { firestore } from '../../../config/firebase';
import { TrainingMessage } from './saveTrainingMessagesFirestore';

/**
 * Service for retrieving training chat messages from Firestore
 */

export interface GetTrainingChatRequest {
  tenantId: string;
  sessionId: string;
  limit?: number;
  startAfter?: string; // Message ID for pagination
}

export interface GetTrainingChatResponse {
  success: boolean;
  messages?: Array<{
    id: string;
    sender: 'user' | 'agent';
    content: string;
    timestamp: string;
    metadata?: any;
  }>;
  sessionInfo?: {
    sessionId: string;
    agentId: string;
    status: string;
    startedAt: string;
    messageCount: number;
  };
  hasMore?: boolean;
  error?: string;
}

export class GetTrainingChatService {
  /**
   * Get all messages for a training session
   */
  async getSessionMessages(request: GetTrainingChatRequest): Promise<GetTrainingChatResponse> {
    try {
      const { tenantId, sessionId, limit = 100, startAfter } = request;
      
      console.log(`=Ö Fetching training messages for session ${sessionId}`);
      console.log(`  - Limit: ${limit}`);
      if (startAfter) console.log(`  - Starting after: ${startAfter}`);

      // Get session reference
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      // Get session document
      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        console.error(`Training session ${sessionId} not found`);
        return {
          success: false,
          error: 'Training session not found'
        };
      }

      const sessionData = sessionDoc.data()!;

      // Build messages query
      let messagesQuery = sessionRef
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(limit);

      // Add pagination if startAfter is provided
      if (startAfter) {
        const startAfterDoc = await sessionRef
          .collection('messages')
          .doc(startAfter)
          .get();
        
        if (startAfterDoc.exists) {
          messagesQuery = messagesQuery.startAfter(startAfterDoc);
        }
      }

      // Execute query
      const messagesSnapshot = await messagesQuery.get();

      // Convert messages to response format
      const messages = messagesSnapshot.docs.map(doc => {
        const data = doc.data() as TrainingMessage;
        return {
          id: data.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp.toDate().toISOString(),
          metadata: data.metadata
        };
      });

      // Check if there are more messages
      const hasMore = messagesSnapshot.docs.length === limit;

      console.log(` Retrieved ${messages.length} training messages`);

      return {
        success: true,
        messages,
        sessionInfo: {
          sessionId: sessionData.sessionId,
          agentId: sessionData.agentId,
          status: sessionData.status,
          startedAt: sessionData.startedAt,
          messageCount: sessionData.stats?.messageCount || 0
        },
        hasMore
      };

    } catch (error) {
      console.error('Error fetching training messages:', error);
      
      return {
        success: false,
        error: `Failed to fetch training messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get conversation history formatted for agent context
   */
  async getConversationHistory(
    tenantId: string,
    sessionId: string,
    messageLimit: number = 10
  ): Promise<{
    success: boolean;
    conversationalContext?: string;
    messages?: Array<{ sender: string; content: string; timestamp: string }>;
    error?: string;
  }> {
    try {
      console.log(`=Ö Getting conversation history for training session ${sessionId}`);

      // Get messages
      const result = await this.getSessionMessages({
        tenantId,
        sessionId,
        limit: messageLimit
      });

      if (!result.success || !result.messages) {
        return {
          success: false,
          error: result.error || 'Failed to get messages'
        };
      }

      // Format messages for conversation context
      const formattedMessages = result.messages.map(msg => ({
        sender: msg.sender === 'user' ? 'Customer' : 'Agent',
        content: msg.content,
        timestamp: msg.timestamp
      }));

      // Build conversational context string
      let conversationalContext = 'Previous conversation:\n';
      formattedMessages.forEach((msg, index) => {
        conversationalContext += `${msg.sender}: ${msg.content}\n`;
        if (index < formattedMessages.length - 1) {
          conversationalContext += '\n';
        }
      });

      console.log(` Built conversation history with ${formattedMessages.length} messages`);

      return {
        success: true,
        conversationalContext,
        messages: formattedMessages
      };

    } catch (error) {
      console.error('Error getting conversation history:', error);
      
      return {
        success: false,
        error: `Failed to get conversation history: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(
    tenantId: string,
    sessionId: string
  ): Promise<{
    success: boolean;
    stats?: {
      totalMessages: number;
      userMessages: number;
      agentMessages: number;
      duration: number;
      lastMessageAt?: string;
    };
    error?: string;
  }> {
    try {
      console.log(`=Ê Getting stats for training session ${sessionId}`);

      // Get all messages
      const result = await this.getSessionMessages({
        tenantId,
        sessionId,
        limit: 1000 // Get all messages for stats
      });

      if (!result.success || !result.messages) {
        return {
          success: false,
          error: result.error || 'Failed to get messages'
        };
      }

      // Calculate stats
      const userMessages = result.messages.filter(m => m.sender === 'user').length;
      const agentMessages = result.messages.filter(m => m.sender === 'agent').length;
      
      // Calculate duration if we have messages
      let duration = 0;
      let lastMessageAt: string | undefined;
      
      if (result.messages.length > 0) {
        const firstMessage = result.messages[0];
        const lastMessage = result.messages[result.messages.length - 1];
        
        duration = new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime();
        lastMessageAt = lastMessage.timestamp;
      }

      console.log(` Session stats calculated`);

      return {
        success: true,
        stats: {
          totalMessages: result.messages.length,
          userMessages,
          agentMessages,
          duration,
          lastMessageAt
        }
      };

    } catch (error) {
      console.error('Error getting session stats:', error);
      
      return {
        success: false,
        error: `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const getTrainingChatService = new GetTrainingChatService();