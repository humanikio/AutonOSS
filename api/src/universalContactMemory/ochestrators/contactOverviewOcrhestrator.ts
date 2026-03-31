import { getConversationHistoryService } from '../conversationHistory/services/getConversationHistory';
import { resolveContactProfile } from '../utils/resolveContactProfile';
import admin from 'firebase-admin';

/**
 * Contact Overview Orchestrator
 *
 * Combines contact profile + conversation history into a single unified response
 * Optimized for AI agent prompt building - provides complete context in one call
 *
 * Used by: SMS and Phone agent communication layers
 */

export interface ContactOverviewRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string;     // For production mode
  sessionId?: string;           // For training mode
  messageLimit?: number;        // Default: 15
  isTraining?: boolean;         // Default: false
}

export interface ContactOverviewResponse {
  success: boolean;
  data?: {
    // Contact Profile Section
    contactProfile: {
      profileId: string;
      profileText: string;        // AI-learned info about contact
      isEmpty: boolean;            // True if profile is empty/new
      lastUpdated: admin.firestore.Timestamp;
    };

    // Conversation History Section
    conversationHistory: {
      messages: Array<{
        id: string;
        direction: 'inbound' | 'outbound';
        body: string;
        timestamp: admin.firestore.Timestamp;
        isFromAgent: boolean;
        agentId?: string;
        fromPhone: string;
        toPhone: string;
      }>;
      summary?: string;
      totalMessages: number;
      hasMoreHistory: boolean;
      conversationalContext: string;  // Pre-formatted for prompts
    };

    // Combined Prompt-Ready Context (convenience fields)
    promptContext: {
      contactProfileSection: string;   // Formatted for injection
      conversationHistorySection: string; // Formatted for injection
    };
  };
  error?: string;
}

export class ContactOverviewOrchestrator {
  /**
   * Get complete contact overview: profile + conversation history
   * Fetches data in parallel for optimal performance
   */
  async getContactOverview(request: ContactOverviewRequest): Promise<ContactOverviewResponse> {
    try {
      const { tenantId, contactId, conversationId, sessionId, messageLimit = 15, isTraining = false } = request;

      console.log('<� ContactOverviewOrchestrator: Starting parallel data fetch');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Mode: ${isTraining ? 'Training' : 'Production'}`);
      console.log(`  - Message Limit: ${messageLimit}`);

      // STEP 1 & 2: Fetch contact profile and conversation history IN PARALLEL
      const [profileResult, historyResult] = await Promise.all([
        // Fetch contact profile
        this.fetchContactProfile(tenantId, contactId),

        // Fetch conversation history
        this.fetchConversationHistory(tenantId, contactId, conversationId, sessionId, messageLimit, isTraining)
      ]);

      console.log('=� Parallel fetch complete:');
      console.log(`  - Profile fetched: ${profileResult.success}`);
      console.log(`  - History fetched: ${historyResult.success}`);

      // STEP 3: Handle errors
      // History is critical - fail if it fails
      if (!historyResult.success) {
        console.error('L Critical: Conversation history fetch failed');
        return {
          success: false,
          error: historyResult.error || 'Failed to fetch conversation history'
        };
      }

      // Profile is not critical - continue with empty profile if it fails
      if (!profileResult.success) {
        console.warn('� Non-critical: Contact profile fetch failed, continuing with empty profile');
        console.warn(`  - Error: ${profileResult.error}`);
      }

      // STEP 4: Format response
      const contactProfile = profileResult.success ? {
        profileId: profileResult.profileId!,
        profileText: profileResult.profileText!,
        isEmpty: profileResult.isEmpty!,
        lastUpdated: profileResult.lastUpdated!
      } : {
        profileId: 'unknown',
        profileText: '',
        isEmpty: true,
        lastUpdated: admin.firestore.Timestamp.now()
      };

      const conversationHistory = {
        messages: historyResult.messages!,
        summary: historyResult.summary,
        totalMessages: historyResult.totalMessages!,
        hasMoreHistory: historyResult.hasMoreHistory!,
        conversationalContext: historyResult.conversationalContext!
      };

      // STEP 5: Build prompt-ready context sections
      const promptContext = {
        contactProfileSection: this.formatContactProfileForPrompt(contactProfile),
        conversationHistorySection: conversationHistory.conversationalContext
      };

      console.log(' Contact overview orchestration complete');
      console.log(`  - Profile: ${contactProfile.isEmpty ? 'Empty' : 'Populated'} (${contactProfile.profileText.length} chars)`);
      console.log(`  - History: ${conversationHistory.messages.length} messages`);
      console.log(`  - Prompt sections ready: ${promptContext.contactProfileSection.length + promptContext.conversationHistorySection.length} total chars`);

      return {
        success: true,
        data: {
          contactProfile,
          conversationHistory,
          promptContext
        }
      };

    } catch (error) {
      console.error('L ContactOverviewOrchestrator error:', error);

      return {
        success: false,
        error: `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch contact profile (non-critical, graceful degradation)
   */
  private async fetchContactProfile(
    tenantId: string,
    contactId: string
  ): Promise<{
    success: boolean;
    profileId?: string;
    profileText?: string;
    isEmpty?: boolean;
    lastUpdated?: admin.firestore.Timestamp;
    error?: string;
  }> {
    try {
      console.log('=� Fetching contact profile...');

      const profileResult = await resolveContactProfile({
        tenantId,
        contactId
      });

      if (!profileResult.success) {
        console.warn('� Profile resolution failed:', profileResult.error);
        return {
          success: false,
          error: profileResult.error
        };
      }

      const profileText = profileResult.currentProfileText || '';
      const isEmpty = profileText.length === 0;

      console.log(` Profile fetched: ${profileResult.profileId} (${isEmpty ? 'empty' : 'populated'})`);

      return {
        success: true,
        profileId: profileResult.profileId!,
        profileText,
        isEmpty,
        lastUpdated: admin.firestore.Timestamp.now() // Could fetch actual timestamp from DB if needed
      };

    } catch (error) {
      console.error('L Error fetching contact profile:', error);
      return {
        success: false,
        error: `Profile fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Fetch conversation history (critical)
   */
  private async fetchConversationHistory(
    tenantId: string,
    contactId: string,
    conversationId?: string,
    sessionId?: string,
    messageLimit: number = 15,
    isTraining: boolean = false
  ): Promise<{
    success: boolean;
    messages?: Array<any>;
    summary?: string;
    totalMessages?: number;
    hasMoreHistory?: boolean;
    conversationalContext?: string;
    error?: string;
  }> {
    try {
      console.log('=� Fetching conversation history...');

      const historyResult = await getConversationHistoryService.getHistory({
        tenantId,
        contactId,
        conversationId,
        sessionId,
        messageLimit,
        isTraining
      });

      if (!historyResult.success || !historyResult.data) {
        console.warn('� No conversation history available');
        // Return empty history structure
        return {
          success: true,
          messages: [],
          totalMessages: 0,
          hasMoreHistory: false,
          conversationalContext: isTraining
            ? 'This is the start of a new training conversation.'
            : 'This is the start of a new conversation.'
        };
      }

      console.log(` History fetched: ${historyResult.data.messages.length} messages`);

      // Map created_at to timestamp to match interface
      const mappedMessages = historyResult.data.messages.map(msg => ({
        id: msg.id,
        direction: msg.direction,
        body: msg.body,
        timestamp: msg.created_at, // Map created_at to timestamp
        isFromAgent: !!msg.agent_id,
        agentId: msg.agent_id,
        fromPhone: msg.from_norm,
        toPhone: msg.to_norm
      }));

      return {
        success: true,
        messages: mappedMessages,
        summary: historyResult.data.summary,
        totalMessages: historyResult.data.totalMessages,
        hasMoreHistory: historyResult.data.hasMoreHistory,
        conversationalContext: this.buildConversationalContext(historyResult.data)
      };

    } catch (error) {
      console.error('L Error fetching conversation history:', error);
      return {
        success: false,
        error: `History fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build conversational context from history data
   */
  private buildConversationalContext(historyData: any): string {
    let context = '';

    // Add summary if available
    if (historyData.summary) {
      context += `PREVIOUS CONVERSATION SUMMARY:\n${historyData.summary}\n\n`;

      if (historyData.hasMoreHistory) {
        context += `NOTE: There is additional conversation history beyond what's summarized above.\n\n`;
      }
    }

    // Add recent messages
    if (historyData.messages && historyData.messages.length > 0) {
      context += historyData.summary ? 'RECENT CONVERSATION:\n' : 'CONVERSATION HISTORY:\n';

      historyData.messages.forEach((msg: any) => {
        const participant = msg.agent_id ? `You (Agent)` : 'Customer';
        const timeAgo = this.getTimeAgoDescription(msg.created_at);

        context += `${participant} (${timeAgo}): ${msg.body}\n`;
      });
    } else {
      context = 'This is the start of a new conversation with this customer.';
    }

    return context;
  }

  /**
   * Get human-readable time description
   */
  private getTimeAgoDescription(timestamp: admin.firestore.Timestamp): string {
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
   * Format contact profile for prompt injection
   */
  private formatContactProfileForPrompt(profile: {
    profileId: string;
    profileText: string;
    isEmpty: boolean;
    lastUpdated: admin.firestore.Timestamp;
  }): string {
    if (profile.isEmpty || !profile.profileText || profile.profileText.trim().length === 0) {
      return `CONTACT PROFILE: NEW CUSTOMER

This is a new customer with no previous profile information.
- Build rapport naturally
- Learn about them through conversation
- No assumptions about preferences or background`;
    }

    return `CONTACT PROFILE: AI-LEARNED CUSTOMER INFORMATION

${profile.profileText}

NOTE: This profile is AI-learned from previous interactions. Use this context to personalize your responses, but always prioritize current conversation context.`;
  }
}

// Export singleton instance
export const contactOverviewOrchestrator = new ContactOverviewOrchestrator();
