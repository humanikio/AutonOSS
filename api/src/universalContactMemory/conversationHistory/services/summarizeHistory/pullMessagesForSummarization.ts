import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';
import { Message } from '../getConversationHistory/pullLatestMessages';

/**
 * Sub-module for pulling messages specifically for summarization
 * Similar to pullLatestMessages but optimized for summarization context
 */

export interface PullMessagesForSummarizationRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  limit: number;
}

export interface PullMessagesForSummarizationResult {
  success: boolean;
  messages: Message[];
  totalMessageCount: number;
  error?: string;
}

export class PullMessagesForSummarization {
  /**
   * Pull messages for summarization context
   * Returns messages in chronological order (oldest to newest)
   */
  async getMessages(request: PullMessagesForSummarizationRequest): Promise<PullMessagesForSummarizationResult> {
    try {
      console.log(`= Pulling ${request.limit} messages for summarization`);

      const messagesRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId)
        .collection('messages');

      // Get total count first
      const totalCountSnapshot = await messagesRef.count().get();
      const totalMessageCount = totalCountSnapshot.data().count;

      console.log(`  Total messages in conversation: ${totalMessageCount}`);

      // Get messages ordered by creation time (newest first, then reverse)
      const messagesQuery = messagesRef
        .orderBy('created_at', 'desc')
        .limit(request.limit);

      const messagesSnapshot = await messagesQuery.get();

      if (messagesSnapshot.empty) {
        console.log('  No messages found for summarization');
        return {
          success: true,
          messages: [],
          totalMessageCount: 0
        };
      }

      // Convert and reverse for chronological order
      const messages: Message[] = messagesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            tenant_id: data.tenant_id,
            conversation_id: data.conversation_id,
            direction: data.direction,
            provider_msg_id: data.provider_msg_id,
            from_norm: data.from_norm,
            to_norm: data.to_norm,
            body: data.body,
            media: data.media,
            status: data.status,
            created_at: data.created_at,
            agent_id: data.agent_id
          };
        })
        .reverse(); // Chronological order (oldest to newest)

      console.log(`  Successfully pulled ${messages.length} messages for summarization`);

      return {
        success: true,
        messages,
        totalMessageCount
      };

    } catch (error) {
      console.error('❌ Error pulling messages for summarization:', error);
      
      return {
        success: false,
        messages: [],
        totalMessageCount: 0,
        error: `Failed to pull messages for summarization: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get messages with context information for better summarization
   * Includes additional metadata that might be useful for Claude
   */
  async getMessagesWithContext(request: PullMessagesForSummarizationRequest): Promise<{
    success: boolean;
    messages: Array<Message & { 
      timeFromPrevious?: number; // Seconds since previous message
      participantType: 'customer' | 'agent' | 'system';
    }>;
    conversationContext: {
      totalMessages: number;
      dateRange: {
        start: FirebaseFirestore.Timestamp;
        end: FirebaseFirestore.Timestamp;
      };
      participantCount: number;
    };
    error?: string;
  }> {
    try {
      console.log(`= Pulling messages with context for summarization`);

      const result = await this.getMessages(request);
      
      if (!result.success || result.messages.length === 0) {
        return {
          success: result.success,
          messages: [],
          conversationContext: {
            totalMessages: 0,
            dateRange: {
              start: admin.firestore.Timestamp.now(),
              end: admin.firestore.Timestamp.now()
            },
            participantCount: 0
          },
          error: result.error
        };
      }

      // Enhance messages with context
      const enhancedMessages = result.messages.map((message, index) => {
        const prevMessage = index > 0 ? result.messages[index - 1] : null;
        const timeFromPrevious = prevMessage 
          ? message.created_at.seconds - prevMessage.created_at.seconds
          : 0;

        const participantType: 'customer' | 'agent' | 'system' = 
          message.agent_id ? 'agent' : 
          message.direction === 'inbound' ? 'customer' : 'system';

        return {
          ...message,
          timeFromPrevious,
          participantType
        };
      });

      // Build conversation context
      const participants = new Set(result.messages.map(m => 
        m.agent_id ? `agent_${m.agent_id}` : `customer_${m.from_norm}`
      ));

      const conversationContext = {
        totalMessages: result.totalMessageCount,
        dateRange: {
          start: result.messages[0].created_at,
          end: result.messages[result.messages.length - 1].created_at
        },
        participantCount: participants.size
      };

      console.log(`  Enhanced ${enhancedMessages.length} messages with context`);

      return {
        success: true,
        messages: enhancedMessages,
        conversationContext
      };

    } catch (error) {
      console.error('❌ Error pulling messages with context:', error);
      
      return {
        success: false,
        messages: [],
        conversationContext: {
          totalMessages: 0,
          dateRange: {
            start: admin.firestore.Timestamp.now(),
            end: admin.firestore.Timestamp.now()
          },
          participantCount: 0
        },
        error: `Failed to pull messages with context: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const pullMessagesForSummarization = new PullMessagesForSummarization();