import { firestore } from '../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    tokens?: number;
    model?: string;
    toolCalls?: any[];
  };
}

export interface ActionChatSession {
  sessionId: string;
  actionId: string;
  agentId: string;
  tenantId: string;
  createdBy: string;
  messages: ChatMessage[];
  messageCount: number;
  summary?: string;
  isActive: boolean;
  createdAt: string;
  lastMessageAt: string;
  updatedAt: string;
  // Current understanding - gets updated with each AI analysis
  currentUnderstanding?: {
    proposedPrompt: string;
    understanding: {
      summary: string;
      behavior: string;
      tone: string;
      keyPoints: string[];
      confidence: number;
    };
    clarifyingQuestion?: string;
    suggestions?: string[];
    updatedAt: string;
  };
}

export class ActionChatManager {
  private tenantId: string;
  private agentId: string;
  private actionId: string;

  constructor(tenantId: string, agentId: string, actionId: string) {
    this.tenantId = tenantId;
    this.agentId = agentId;
    // Handle "new" actions by generating a proper ID
    this.actionId = actionId === 'new' ? `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : actionId;
  }

  /**
   * Get the current active session or create a new one
   */
  async getCurrentSession(userId: string): Promise<ActionChatSession> {
    try {
      // Look for active sessions
      const sessionsRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions');

      const activeSessionQuery = await sessionsRef
        .where('isActive', '==', true)
        .orderBy('lastMessageAt', 'desc')
        .limit(1)
        .get();

      if (!activeSessionQuery.empty) {
        const sessionDoc = activeSessionQuery.docs[0];
        const sessionData = sessionDoc.data() as ActionChatSession;
        return sessionData;
      }

      // Create new session if none exists
      return await this.createNewSession(userId);
    } catch (error) {
      console.error('Error getting current session:', error);
      throw new Error(`Failed to get current session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new chat session
   */
  async createNewSession(userId: string): Promise<ActionChatSession> {
    try {
      const sessionId = uuidv4();
      const timestamp = new Date().toISOString();

      const newSession: ActionChatSession = {
        sessionId,
        actionId: this.actionId,
        agentId: this.agentId,
        tenantId: this.tenantId,
        createdBy: userId,
        messages: [],
        messageCount: 0,
        isActive: true,
        createdAt: timestamp,
        lastMessageAt: timestamp,
        updatedAt: timestamp
      };

      // Deactivate other sessions first
      await this.deactivateOtherSessions();

      // Create new session
      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      await sessionRef.set(newSession);

      console.log(`✅ Action chat session created: ${sessionId} for action ${this.actionId}`);
      return newSession;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error(`Failed to create chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a message to the session
   */
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any): Promise<ChatMessage> {
    try {
      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      const message: ChatMessage = {
        id: messageId,
        role,
        content,
        timestamp,
        metadata
      };

      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      // Get current session
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        throw new Error('Session not found');
      }

      const session = sessionDoc.data() as ActionChatSession;
      const updatedMessages = [...session.messages, message];

      // Update session with new message
      await sessionRef.update({
        messages: updatedMessages,
        messageCount: updatedMessages.length,
        lastMessageAt: timestamp,
        updatedAt: timestamp
      });

      console.log(`💬 Message added to action session ${sessionId}: ${role} - ${content.substring(0, 50)}...`);
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<ActionChatSession | null> {
    try {
      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        return null;
      }

      return sessionDoc.data() as ActionChatSession;
    } catch (error) {
      console.error('Error getting session:', error);
      throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all sessions for this action
   */
  async getAllSessions(): Promise<ActionChatSession[]> {
    try {
      const sessionsRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions');

      const snapshot = await sessionsRef
        .orderBy('lastMessageAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as ActionChatSession);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      throw new Error(`Failed to get sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      await sessionRef.delete();
      console.log(`🗑️ Action chat session deleted: ${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Switch to a different session (make it active)
   */
  async switchToSession(sessionId: string): Promise<ActionChatSession> {
    try {
      // Deactivate all sessions
      await this.deactivateOtherSessions();

      // Activate target session
      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      await sessionRef.update({
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found after activation');
      }

      return session;
    } catch (error) {
      console.error('Error switching session:', error);
      throw new Error(`Failed to switch session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deactivate all other sessions
   */
  private async deactivateOtherSessions(): Promise<void> {
    try {
      const sessionsRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions');

      const activeSessions = await sessionsRef.where('isActive', '==', true).get();

      const batch = firestore.batch();
      activeSessions.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });

      if (!activeSessions.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error deactivating sessions:', error);
      // Don't throw here - this is a helper function
    }
  }

  /**
   * Get recent messages for context (last N messages)
   */
  getRecentMessages(session: ActionChatSession, count: number = 10): ChatMessage[] {
    return session.messages.slice(-count);
  }

  /**
   * Estimate token count for messages
   */
  estimateTokenCount(messages: ChatMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4); // Rough estimate: 4 chars per token
  }

  /**
   * Get the actual action ID being used (after processing "new" actions)
   */
  getActionId(): string {
    return this.actionId;
  }

  /**
   * Update session with current understanding
   */
  async updateSessionUnderstanding(sessionId: string, draftUpdate: any): Promise<void> {
    try {
      const sessionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId)
        .collection('sessions')
        .doc(sessionId);

      // Get existing session to preserve other understanding fields
      const existingSession = await sessionRef.get();
      const existingUnderstanding = existingSession.exists ? 
        (existingSession.data()?.currentUnderstanding || {}) : {};

      const currentUnderstanding = {
        proposedPrompt: draftUpdate.proposedPrompt || existingUnderstanding.proposedPrompt || '',
        understanding: draftUpdate.understanding !== undefined ? draftUpdate.understanding : (existingUnderstanding.understanding || {}),
        clarifyingQuestion: draftUpdate.clarifyingQuestion !== undefined ? draftUpdate.clarifyingQuestion : existingUnderstanding.clarifyingQuestion,
        suggestions: draftUpdate.suggestions !== undefined ? draftUpdate.suggestions : existingUnderstanding.suggestions,
        updatedAt: new Date().toISOString()
      };

      await sessionRef.update({
        currentUnderstanding,
        updatedAt: new Date().toISOString()
      });

      console.log(`📋 Session understanding updated for ${sessionId}`);
    } catch (error) {
      console.error('Error updating session understanding:', error);
      // Don't throw - this shouldn't stop the main flow
    }
  }
}