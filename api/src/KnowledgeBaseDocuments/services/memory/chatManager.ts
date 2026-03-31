import { firestore } from '../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary?: string;
  messages: ChatMessage[];
  metadata: {
    lastMessage: string;
    isActive: boolean;
  };
}

export class ChatManager {
  private readonly MAX_MESSAGES_IN_MEMORY = 50;

  /**
   * Create a new chat session
   */
  async createChatSession(tenantId: string, docId: string): Promise<string> {
    try {
      const chatId = uuidv4();
      const now = new Date().toISOString();

      const chatSession: ChatSession = {
        id: chatId,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        messages: [],
        metadata: {
          lastMessage: now,
          isActive: true
        }
      };

      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      await chatRef.set(chatSession);

      console.log(`Created new chat session ${chatId} for document ${docId}`);
      return chatId;

    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  /**
   * Add a message to the chat session
   */
  async addMessage(
    tenantId: string, 
    docId: string, 
    chatId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<ChatMessage> {
    try {
      const message: ChatMessage = {
        id: uuidv4(),
        role,
        content,
        timestamp: new Date().toISOString()
      };

      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      // Update chat with new message
      await chatRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(message),
        messageCount: admin.firestore.FieldValue.increment(1),
        updatedAt: message.timestamp,
        'metadata.lastMessage': message.timestamp
      });

      console.log(`Added message to chat ${chatId}`);
      return message;

    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error('Failed to add message');
    }
  }

  /**
   * Load chat history
   */
  async loadChatHistory(
    tenantId: string, 
    docId: string, 
    chatId: string,
    limit: number = 50
  ): Promise<ChatSession | null> {
    try {
      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        return null;
      }

      const data = chatDoc.data() as ChatSession;
      
      // Return only recent messages if there are too many
      if (data.messages.length > limit) {
        data.messages = data.messages.slice(-limit);
      }

      return data;

    } catch (error) {
      console.error('Error loading chat history:', error);
      return null;
    }
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(
    tenantId: string,
    docId: string,
    chatId: string,
    count: number = 10
  ): Promise<ChatMessage[]> {
    try {
      const chatSession = await this.loadChatHistory(tenantId, docId, chatId, count);
      
      if (!chatSession) {
        return [];
      }

      // Return the most recent messages
      return chatSession.messages.slice(-count);

    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Update chat summary
   */
  async updateChatSummary(
    tenantId: string,
    docId: string,
    chatId: string,
    summary: string
  ): Promise<void> {
    try {
      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      await chatRef.update({
        summary,
        updatedAt: new Date().toISOString()
      });

      console.log(`Updated summary for chat ${chatId}`);

    } catch (error) {
      console.error('Error updating chat summary:', error);
      throw new Error('Failed to update chat summary');
    }
  }

  /**
   * List all chat sessions for a document
   */
  async listChatSessions(
    tenantId: string,
    docId: string
  ): Promise<Array<{id: string; createdAt: string; messageCount: number}>> {
    try {
      const chatsRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats');

      const snapshot = await chatsRef
        .where('metadata.isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          createdAt: data.createdAt,
          messageCount: data.messageCount
        };
      });

    } catch (error) {
      console.error('Error listing chat sessions:', error);
      return [];
    }
  }

  /**
   * Delete a chat session
   */
  async deleteChatSession(
    tenantId: string,
    docId: string,
    chatId: string
  ): Promise<void> {
    try {
      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      await chatRef.delete();
      console.log(`Deleted chat session ${chatId}`);

    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }

  /**
   * Prune old messages while keeping summary
   */
  async pruneOldMessages(
    tenantId: string,
    docId: string,
    chatId: string,
    keepCount: number = 20
  ): Promise<void> {
    try {
      const chatSession = await this.loadChatHistory(tenantId, docId, chatId);
      
      if (!chatSession || chatSession.messages.length <= keepCount) {
        return;
      }

      // Keep only recent messages
      const recentMessages = chatSession.messages.slice(-keepCount);

      const chatRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('kbDocs').doc(docId)
        .collection('chats').doc(chatId);

      await chatRef.update({
        messages: recentMessages,
        updatedAt: new Date().toISOString()
      });

      console.log(`Pruned old messages for chat ${chatId}, kept ${keepCount} recent messages`);

    } catch (error) {
      console.error('Error pruning messages:', error);
    }
  }
}

export const chatManager = new ChatManager();