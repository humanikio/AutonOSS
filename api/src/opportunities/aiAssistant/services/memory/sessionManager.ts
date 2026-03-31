import { db } from '../../../../config/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AISessionData } from '../startSession/createFirestoreDocument';

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  stagesGenerated?: boolean;
}

export interface SessionSummary {
  businessType?: string;
  mainGoals: string[];
  processSteps: string[];
  decisionPoints: string[];
  keyRequirements: string[];
  stagesCreated: number;
}

export class SessionManager {
  private readonly MAX_MESSAGES_IN_MEMORY = 20;
  private readonly SUMMARIZE_AFTER_MESSAGES = 15;

  /**
   * Load session data from Firestore
   */
  async loadSessionData(tenantId: string, sessionId: string): Promise<AISessionData | null> {
    try {
      const sessionRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc('main')
        .collection('aiAssistant')
        .doc('main')
        .collection('sessions')
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        return null;
      }

      const data = sessionDoc.data() as AISessionData;
      console.log(`📋 Loaded session ${sessionId} with ${data.messages.length} messages`);
      
      return data;

    } catch (error) {
      console.error('Error loading session data:', error);
      return null;
    }
  }

  /**
   * Get recent messages for context
   */
  async getRecentMessages(
    tenantId: string,
    sessionId: string,
    count: number = 10
  ): Promise<SessionMessage[]> {
    try {
      const sessionData = await this.loadSessionData(tenantId, sessionId);
      
      if (!sessionData) {
        return [];
      }

      // Convert to SessionMessage format and return recent messages
      const messages: SessionMessage[] = sessionData.messages.map(msg => ({
        id: uuidv4(), // Generate ID if not present
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

      return messages.slice(-count);

    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Update session summary based on conversation
   */
  async updateSessionSummary(
    tenantId: string,
    sessionId: string,
    summary: SessionSummary
  ): Promise<void> {
    try {
      const sessionRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc('main')
        .collection('aiAssistant')
        .doc('main')
        .collection('sessions')
        .doc(sessionId);

      await sessionRef.update({
        'metadata.summary': summary,
        updatedAt: new Date().toISOString()
      });

      console.log(`📋 Updated summary for session ${sessionId}`);

    } catch (error) {
      console.error('Error updating session summary:', error);
      throw new Error('Failed to update session summary');
    }
  }

  /**
   * Get session context including pipeline and business info
   */
  async getSessionContext(tenantId: string, sessionId: string): Promise<{
    pipelineName: string;
    existingStages: string[];
    businessContext: string;
    stagesGenerated: boolean;
  }> {
    try {
      const sessionData = await this.loadSessionData(tenantId, sessionId);
      
      if (!sessionData) {
        return {
          pipelineName: 'Unknown Pipeline',
          existingStages: [],
          businessContext: 'No context available',
          stagesGenerated: false
        };
      }

      const existingStages = sessionData.stages.map(stage => stage.name);
      const stagesGenerated = sessionData.metadata.stagesGenerated || false;
      
      // Extract business context from first message
      const firstUserMessage = sessionData.messages.find(msg => msg.role === 'user');
      const businessContext = firstUserMessage?.content || 'No business context provided';

      return {
        pipelineName: sessionData.pipeline.name,
        existingStages,
        businessContext,
        stagesGenerated
      };

    } catch (error) {
      console.error('Error getting session context:', error);
      return {
        pipelineName: 'Error Loading Pipeline',
        existingStages: [],
        businessContext: 'Error loading context',
        stagesGenerated: false
      };
    }
  }

  /**
   * Check if session needs summarization
   */
  shouldSummarize(messageCount: number): boolean {
    return messageCount >= this.SUMMARIZE_AFTER_MESSAGES;
  }

  /**
   * Get conversation length for memory management
   */
  async getMessageCount(tenantId: string, sessionId: string): Promise<number> {
    try {
      const sessionData = await this.loadSessionData(tenantId, sessionId);
      return sessionData?.messages.length || 0;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  /**
   * Get recent sessions for a user (for session continuation)
   */
  async getRecentSessions(
    tenantId: string,
    limit: number = 5
  ): Promise<Array<{
    id: string;
    title: string;
    lastInteraction: string;
    messageCount: number;
    stagesGenerated: boolean;
    pipelineName: string;
    preview: string;
  }>> {
    try {
      console.log(`📋 Getting recent sessions for tenant ${tenantId}`);
      
      const sessionsRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc('main')
        .collection('aiAssistant')
        .doc('main')
        .collection('sessions')
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .select('updatedAt', 'createdAt', 'metadata', 'pipeline', 'messageCount', 'firstUserMessage');

      const snapshot = await sessionsRef.get();
      
      if (snapshot.empty) {
        console.log('📋 No sessions found');
        return [];
      }

      const sessions = snapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          title: this.generateSessionTitle(data.firstUserMessage || ''),
          lastInteraction: data.updatedAt || data.createdAt,
          messageCount: data.messageCount || 0,
          stagesGenerated: data.metadata?.stagesGenerated || false,
          pipelineName: data.pipeline?.name || 'Unknown',
          preview: this.generatePreview(data.firstUserMessage || '')
        };
      });

      console.log(`📋 Found ${sessions.length} recent sessions`);
      return sessions;

    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }

  /**
   * Generate a title for a session based on the first user message
   */
  private generateSessionTitle(content: string): string {
    if (!content) return 'Untitled Session';
    
    // Extract business type or main concept from the first message
    const words = content.toLowerCase().split(' ');
    const businessKeywords = ['real estate', 'saas', 'consulting', 'agency', 'restaurant', 'retail', 'marketing', 'software', 'service'];
    
    for (const keyword of businessKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        return `${keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Pipeline`;
      }
    }
    
    // Fallback to first few words
    const firstWords = content.split(' ').slice(0, 4).join(' ');
    return firstWords.length > 30 ? firstWords.substring(0, 30) + '...' : firstWords;
  }

  /**
   * Generate a preview text for the session
   */
  private generatePreview(content: string): string {
    if (!content) return 'No preview available';
    
    // Return first 60 characters
    return content.length > 60 ? content.substring(0, 60) + '...' : content;
  }

  /**
   * Prune old messages while keeping summary
   */
  async pruneOldMessages(
    tenantId: string,
    sessionId: string,
    keepCount: number = 10
  ): Promise<void> {
    try {
      const sessionData = await this.loadSessionData(tenantId, sessionId);
      
      if (!sessionData || sessionData.messages.length <= keepCount) {
        return;
      }

      // Keep only recent messages
      const recentMessages = sessionData.messages.slice(-keepCount);

      const sessionRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('pipelines')
        .doc('main')
        .collection('aiAssistant')
        .doc('main')
        .collection('sessions')
        .doc(sessionId);

      await sessionRef.update({
        messages: recentMessages,
        updatedAt: new Date().toISOString(),
        'metadata.messagesPruned': true
      });

      console.log(`📋 Pruned old messages for session ${sessionId}, kept ${keepCount} recent messages`);

    } catch (error) {
      console.error('Error pruning messages:', error);
    }
  }
}

export const sessionManager = new SessionManager();