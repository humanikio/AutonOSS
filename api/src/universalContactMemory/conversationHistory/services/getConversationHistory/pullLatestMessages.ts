import { firestore } from '../../../../config/firebase';

/**
 * Service module for pulling the latest messages from a conversation
 * Fetches messages from Firestore in chronological order (oldest to newest)
 */

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  provider_msg_id: string;
  from_norm: string;
  to_norm: string;
  body: string;
  media?: Array<{
    url: string;
    type: string;
  }>;
  status: string;
  created_at: FirebaseFirestore.Timestamp;
  agent_id?: string;
}

export interface PullLatestMessagesRequest {
  tenantId: string;
  contactId?: string;        // Required for production mode
  conversationId?: string;   // Required for production mode  
  sessionId?: string;        // Required for training mode
  limit: number;
  isTraining?: boolean;      // Flag to indicate training mode
}

export interface PullLatestMessagesResult {
  success: boolean;
  messages: Message[];
  totalCount: number;
  hasMoreMessages: boolean;
  error?: string;
}

export class PullLatestMessages {
  /**
   * Pull the latest messages from a conversation
   * Returns messages in chronological order (oldest to newest)
   */
  async getMessages(request: PullLatestMessagesRequest): Promise<PullLatestMessagesResult> {
    try {
      if (request.isTraining && request.sessionId) {
        return this.getTrainingMessages(request);
      } else {
        return this.getProductionMessages(request);
      }
    } catch (error) {
      console.error('❌ Error pulling latest messages:', error);
      return {
        success: false,
        messages: [],
        totalCount: 0,
        hasMoreMessages: false,
        error: `Failed to pull messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get messages from production conversations
   */
  private async getProductionMessages(request: PullLatestMessagesRequest): Promise<PullLatestMessagesResult> {
    try {
      console.log(`= Pulling latest ${request.limit} messages from conversation ${request.conversationId}`);

      // Get messages collection reference
      const messagesRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId!)
        .collection('conversations')
        .doc(request.conversationId!)
        .collection('messages');

      // First, get total count of messages in the conversation
      const totalCountSnapshot = await messagesRef.count().get();
      const totalCount = totalCountSnapshot.data().count;

      console.log(`  Total messages in conversation: ${totalCount}`);

      // Get the latest messages ordered by creation time (newest first)
      const messagesQuery = messagesRef
        .orderBy('created_at', 'desc')
        .limit(request.limit);

      const messagesSnapshot = await messagesQuery.get();

      if (messagesSnapshot.empty) {
        console.log('  No messages found in conversation');
        return {
          success: true,
          messages: [],
          totalCount: 0,
          hasMoreMessages: false
        };
      }

      // Convert Firestore documents to Message objects
      const messages: Message[] = messagesSnapshot.docs.map(doc => {
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
      });

      // Reverse the array to get chronological order (oldest to newest)
      const chronologicalMessages = messages.reverse();

      const hasMoreMessages = totalCount > request.limit;

      console.log(`  Successfully pulled ${chronologicalMessages.length} messages`);
      console.log(`  Has more messages: ${hasMoreMessages}`);

      return {
        success: true,
        messages: chronologicalMessages,
        totalCount,
        hasMoreMessages
      };

    } catch (error) {
      console.error('L Error pulling latest messages:', error);
      
      return {
        success: false,
        messages: [],
        totalCount: 0,
        hasMoreMessages: false,
        error: `Failed to pull messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get messages from training sessions
   */
  private async getTrainingMessages(request: PullLatestMessagesRequest): Promise<PullLatestMessagesResult> {
    try {
      console.log(`= Pulling latest ${request.limit} messages from training session ${request.sessionId}`);

      // Get messages collection reference for training session
      const messagesRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('trainingSessions')
        .doc(request.sessionId!)
        .collection('messages');

      // Get total count of messages in the training session
      const totalCountSnapshot = await messagesRef.count().get();
      const totalCount = totalCountSnapshot.data().count;

      console.log(`  Total messages in training session: ${totalCount}`);

      // Get the latest messages ordered by timestamp (newest first)
      const messagesQuery = messagesRef
        .orderBy('timestamp', 'desc')
        .limit(request.limit);

      const messagesSnapshot = await messagesQuery.get();

      if (messagesSnapshot.empty) {
        console.log('  No messages found in training session');
        return {
          success: true,
          messages: [],
          totalCount: 0,
          hasMoreMessages: false
        };
      }

      // Convert training messages to Universal Memory format
      const messages: Message[] = messagesSnapshot.docs.map(doc => {
        return this.convertTrainingToUniversalFormat(doc.data(), request.sessionId!);
      });

      // Reverse the array to get chronological order (oldest to newest)
      const chronologicalMessages = messages.reverse();

      const hasMoreMessages = totalCount > request.limit;

      console.log(`  Successfully pulled ${chronologicalMessages.length} training messages`);
      console.log(`  Has more messages: ${hasMoreMessages}`);

      return {
        success: true,
        messages: chronologicalMessages,
        totalCount,
        hasMoreMessages
      };

    } catch (error) {
      console.error('❌ Error pulling training messages:', error);
      
      return {
        success: false,
        messages: [],
        totalCount: 0,
        hasMoreMessages: false,
        error: `Failed to pull training messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert training message format to Universal Memory message format
   */
  private convertTrainingToUniversalFormat(trainingMsg: any, sessionId: string): Message {
    return {
      id: trainingMsg.id,
      tenant_id: trainingMsg.tenantId || 'training',
      conversation_id: `training_${sessionId}`,
      direction: trainingMsg.sender === 'user' ? 'inbound' : 'outbound',
      provider_msg_id: `training_${trainingMsg.id}`,
      from_norm: trainingMsg.sender === 'user' ? 'training_user' : 'training_agent',
      to_norm: trainingMsg.sender === 'user' ? 'training_agent' : 'training_user',
      body: trainingMsg.content,
      media: trainingMsg.media || [],
      status: 'delivered',
      created_at: trainingMsg.timestamp,
      agent_id: trainingMsg.sender === 'agent' ? trainingMsg.metadata?.agentId : undefined
    };
  }

  /**
   * Get a quick count of total messages in a conversation
   */
  async getMessageCount(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      console.log(`= Getting message count for conversation ${conversationId}`);

      const messagesRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId)
        .collection('messages');

      const countSnapshot = await messagesRef.count().get();
      const count = countSnapshot.data().count;

      console.log(`  Total message count: ${count}`);

      return {
        success: true,
        count
      };

    } catch (error) {
      console.error('L Error getting message count:', error);
      
      return {
        success: false,
        count: 0,
        error: `Failed to get message count: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const pullLatestMessages = new PullLatestMessages();