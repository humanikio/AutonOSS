import { pullLatestMessages } from './getConversationHistory/pullLatestMessages';
import { historyTruncation } from './getConversationHistory/historyTruncation';
import { pullSummary } from './getConversationHistory/pullSummary';
import { summarizationCheck } from './getConversationHistory/summrizationCheck';

/**
 * Main service for retrieving conversation history
 * Orchestrates the complete pipeline: pull messages � truncate � get summary � background processing
 */

export interface ConversationHistoryRequest {
  tenantId: string;
  contactId?: string;        // Required for production mode
  conversationId?: string;   // Required for production mode
  sessionId?: string;        // Required for training mode
  messageLimit: number;
  isTraining?: boolean;      // Flag to indicate training mode
}

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

export interface ConversationHistoryData {
  conversationId: string;
  messages: Message[];
  summary?: string;
  totalMessages: number;
  hasMoreHistory: boolean;
}

export interface ConversationHistoryResult {
  success: boolean;
  data?: ConversationHistoryData;
  error?: string;
}

export class GetConversationHistoryService {
  /**
   * Main method to get conversation history with intelligent truncation and summarization
   */
  async getHistory(request: ConversationHistoryRequest): Promise<ConversationHistoryResult> {
    try {
      if (request.isTraining && request.sessionId) {
        return this.getTrainingHistory(request);
      } else {
        return this.getProductionHistory(request);
      }
    } catch (error) {
      console.error('❌ Error in conversation history service:', error);
      return {
        success: false,
        error: `Failed to get conversation history: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get conversation history for production mode
   */
  private async getProductionHistory(request: ConversationHistoryRequest): Promise<ConversationHistoryResult> {
    try {
      console.log('= Starting production conversation history retrieval pipeline');
      console.log(`  - Conversation ID: ${request.conversationId}`);
      console.log(`  - Message Limit: ${request.messageLimit}`);

      // Step 1: Pull latest messages from Firestore
      console.log('\n= Step 1: Pulling latest messages');
      const messagesResult = await pullLatestMessages.getMessages({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        limit: request.messageLimit,
        isTraining: false
      });

      if (!messagesResult.success) {
        return {
          success: false,
          error: messagesResult.error
        };
      }

      console.log(`  Fetched ${messagesResult.messages.length} messages`);

      // Step 2: Apply history truncation if necessary
      console.log('\n= Step 2: Applying history truncation');
      const truncationResult = await historyTruncation.truncateIfNeeded({
        tenantId: request.tenantId,
        contactId: request.contactId!,
        conversationId: request.conversationId!,
        messages: messagesResult.messages,
        characterLimit: 8000
      });

      if (!truncationResult.success) {
        return {
          success: false,
          error: truncationResult.error
        };
      }

      console.log(`  Truncation result: ${truncationResult.wasTruncated ? 'TRUNCATED' : 'NO TRUNCATION NEEDED'}`);
      console.log(`  Final message count: ${truncationResult.messages.length}`);

      // Step 3: Pull existing summary if available
      console.log('\n= Step 3: Pulling existing summary');
      const summaryResult = await pullSummary.getSummary({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId
      });

      console.log(`  Summary available: ${summaryResult.summary ? 'YES' : 'NO'}`);

      // Step 4: Prepare response data
      const responseData: ConversationHistoryData = {
        conversationId: request.conversationId!,
        messages: truncationResult.messages,
        summary: summaryResult.summary || undefined,
        totalMessages: messagesResult.totalCount,
        hasMoreHistory: truncationResult.wasTruncated || messagesResult.hasMoreMessages
      };

      console.log(' Conversation history pipeline completed successfully');
      console.log(`  Response summary:`, {
        messageCount: responseData.messages.length,
        hasSummary: !!responseData.summary,
        hasMoreHistory: responseData.hasMoreHistory,
        totalMessages: responseData.totalMessages
      });

      // Step 5: Trigger background summarization check (fire and forget)
      console.log('\n= Step 5: Triggering background summarization check');
      this.triggerBackgroundSummarization(request)
        .catch(error => {
          console.error('Background summarization check failed (non-blocking):', error);
        });

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('L Error in conversation history pipeline:', error);
      
      return {
        success: false,
        error: `Conversation history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get conversation history for training mode
   */
  private async getTrainingHistory(request: ConversationHistoryRequest): Promise<ConversationHistoryResult> {
    try {
      console.log('= Starting training conversation history retrieval pipeline');
      console.log(`  - Training Session ID: ${request.sessionId}`);
      console.log(`  - Message Limit: ${request.messageLimit}`);

      // Step 1: Pull latest messages from training session
      console.log('\n= Step 1: Pulling latest training messages');
      const messagesResult = await pullLatestMessages.getMessages({
        tenantId: request.tenantId,
        sessionId: request.sessionId,
        limit: request.messageLimit,
        isTraining: true
      });

      if (!messagesResult.success) {
        return {
          success: false,
          error: messagesResult.error
        };
      }

      console.log(`  Fetched ${messagesResult.messages.length} training messages`);

      // Step 2: Apply history truncation if necessary (same logic as production)
      console.log('\n= Step 2: Applying history truncation to training messages');
      const truncationResult = await historyTruncation.truncateIfNeeded({
        tenantId: request.tenantId,
        contactId: `training_${request.sessionId}`, // Virtual contact ID for training
        conversationId: `training_${request.sessionId}`,
        messages: messagesResult.messages,
        characterLimit: 8000 // Same limit as production
      });

      if (!truncationResult.success) {
        return {
          success: false,
          error: truncationResult.error
        };
      }

      console.log(`  Truncation result: ${truncationResult.wasTruncated ? 'TRUNCATED' : 'NO TRUNCATION NEEDED'}`);
      console.log(`  Final message count: ${truncationResult.messages.length}`);

      // Step 3: Pull existing summary from training session
      console.log('\n= Step 3: Pulling training session summary');
      const summaryResult = await pullSummary.getSummary({
        tenantId: request.tenantId,
        sessionId: request.sessionId,
        isTraining: true
      });

      console.log(`  Summary available: ${summaryResult.summary ? 'YES' : 'NO'}`);

      // Step 4: Prepare response data
      const responseData: ConversationHistoryData = {
        conversationId: `training_${request.sessionId}`,
        messages: truncationResult.messages,
        summary: summaryResult.summary || undefined,
        totalMessages: messagesResult.totalCount,
        hasMoreHistory: truncationResult.wasTruncated || messagesResult.hasMoreMessages
      };

      console.log('✅ Training conversation history pipeline completed successfully');
      console.log(`  Response summary:`, {
        messageCount: responseData.messages.length,
        hasSummary: !!responseData.summary,
        hasMoreHistory: responseData.hasMoreHistory,
        totalMessages: responseData.totalMessages
      });

      // Step 5: Trigger background summarization check for training session (fire and forget)
      console.log('\n= Step 5: Triggering background training summarization check');
      this.triggerTrainingBackgroundSummarization(request)
        .catch(error => {
          console.error('Background training summarization check failed (non-blocking):', error);
        });

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error in training conversation history pipeline:', error);
      
      return {
        success: false,
        error: `Training conversation history retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Background processing for summarization check
   * This runs after the response has been sent to the client
   */
  private async triggerBackgroundSummarization(request: ConversationHistoryRequest): Promise<void> {
    try {
      console.log('= Starting background summarization check');
      
      await summarizationCheck.checkAndSummarize({
        tenantId: request.tenantId,
        contactId: request.contactId!,
        conversationId: request.conversationId!
      });

      console.log(' Background summarization check completed');

    } catch (error) {
      console.error('L Background summarization check error:', error);
      // Don't throw - this is background processing
    }
  }

  /**
   * Background processing for training session summarization check
   * This runs after the response has been sent to the client
   */
  private async triggerTrainingBackgroundSummarization(request: ConversationHistoryRequest): Promise<void> {
    try {
      console.log('= Starting background training summarization check');
      
      // For now, we'll implement basic training session summarization
      // This could be enhanced to use the same summarization logic as production
      // but store the summary in the training session document
      
      console.log('⚠️ Training session background summarization not yet implemented');
      console.log('   This is where we would check if the training session needs summarization');
      console.log('   and create/update summaries in the training session document');

    } catch (error) {
      console.error('❌ Background training summarization check error:', error);
      // Don't throw - this is background processing
    }
  }
}

export const getConversationHistoryService = new GetConversationHistoryService();