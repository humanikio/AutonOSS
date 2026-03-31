import { pullMessagesForSummarization } from './summarizeHistory/pullMessagesForSummarization';
import { pullExistingSummary } from './summarizeHistory/pullExistingSummary';
import { generateSummary } from './summarizeHistory/generateSummary';
import { saveSummary } from './summarizeHistory/saveSummary';
import { triggerContactProfileAnalysisBackground } from '../tools/callContactProfileAnalysis';
import { summarizePhoneTranscript } from './summarizePhoneTranscript';

/**
 * Main service for conversation history summarization
 * Uses Claude 4 to generate intelligent conversation summaries
 * Orchestrates the complete summarization pipeline
 */

export interface SummarizeConversationRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageLimit?: number; // Default: 15
  isPhone?: boolean; // Flag to indicate this is a phone call transcript
  phoneTranscriptData?: { // Phone-specific data for transcript summarization
    transcript: any[];
    analysis?: any;
    metadata?: any;
    duration?: number;
    direction?: 'inbound' | 'outbound';
  };
}

export interface SummarizeConversationResult {
  success: boolean;
  summary?: string;
  summaryLength?: number;
  messagesProcessed?: number;
  previousSummaryIncluded?: boolean;
  error?: string;
}

export class SummarizeHistoryService {
  /**
   * Main method to summarize conversation history
   * Pulls messages, existing summary, generates new summary with Claude 4, and saves result
   */
  async summarizeConversation(request: SummarizeConversationRequest): Promise<SummarizeConversationResult> {
    try {
      const messageLimit = request.messageLimit || 15;

      console.log('= Starting conversation summarization pipeline');
      console.log(`  - Conversation ID: ${request.conversationId}`);
      console.log(`  - Message Limit: ${messageLimit}`);
      console.log(`  - Is Phone Call: ${request.isPhone ? 'YES' : 'NO'}`);

      // Special handling for phone call transcripts
      if (request.isPhone && request.phoneTranscriptData) {
        console.log('\n📞 Phone call detected - using transcript summarization');
        return this.summarizePhoneCall(request);
      }

      // Step 1: Pull latest messages for summarization
      console.log('\n= Step 1: Pulling messages for summarization');
      const messagesResult = await pullMessagesForSummarization.getMessages({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        limit: messageLimit
      });

      if (!messagesResult.success) {
        return {
          success: false,
          error: messagesResult.error
        };
      }

      if (messagesResult.messages.length === 0) {
        console.log('  � No messages found - skipping summarization');
        return {
          success: true,
          summary: '',
          summaryLength: 0,
          messagesProcessed: 0,
          previousSummaryIncluded: false
        };
      }

      console.log(`  Fetched ${messagesResult.messages.length} messages for summarization`);

      // Step 2: Pull existing summary if available
      console.log('\n= Step 2: Pulling existing summary');
      const existingSummaryResult = await pullExistingSummary.getSummary({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId
      });

      if (!existingSummaryResult.success) {
        return {
          success: false,
          error: existingSummaryResult.error
        };
      }

      const hasPreviousSummary = !!existingSummaryResult.summary;
      console.log(`  Previous summary: ${hasPreviousSummary ? 'FOUND' : 'NOT FOUND'}`);

      // Step 3: Generate new summary using Claude 4
      console.log('\n= Step 3: Generating summary with Claude 4');
      const generateResult = await generateSummary.createSummary({
        messages: messagesResult.messages,
        existingSummary: existingSummaryResult.summary,
        conversationId: request.conversationId
      });

      if (!generateResult.success) {
        return {
          success: false,
          error: generateResult.error
        };
      }

      console.log(`  Generated summary (${generateResult.summary.length} characters)`);

      // Step 4: Save the new summary to Firestore
      console.log('\n= Step 4: Saving summary to Firestore');
      const saveResult = await saveSummary.saveSummary({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        summary: generateResult.summary,
        messagesProcessed: messagesResult.messages.length,
        previousSummaryIncluded: hasPreviousSummary
      });

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };

      }

      console.log('✅ Conversation summarization pipeline completed successfully');
      console.log(`  Final summary length: ${generateResult.summary.length} characters`);

      // Step 5: Trigger background contact profile analysis (fire and forget)
      console.log('\n📋 Step 5: Triggering background contact profile analysis');
      triggerContactProfileAnalysisBackground({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationSummary: generateResult.summary,
        recentMessages: messagesResult.messages
      });

      return {
        success: true,
        summary: generateResult.summary,
        summaryLength: generateResult.summary.length,
        messagesProcessed: messagesResult.messages.length,
        previousSummaryIncluded: hasPreviousSummary
      };
    } catch (error) {
      console.error('L Error in conversation summarization pipeline:', error);
      
      return {
        success: false,
        error: `Conversation summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get summarization statistics for a conversation
   */
  async getSummarizationStats(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{
    success: boolean;
    stats?: {
      hasSummary: boolean;
      summaryLength: number;
      lastUpdated?: FirebaseFirestore.Timestamp;
      messagesProcessed?: number;
      needsSummarization: boolean;
    };
    error?: string;
  }> {
    try {
      console.log(`= Getting summarization stats for conversation ${conversationId}`);

      const summaryResult = await pullExistingSummary.getSummary({
        tenantId,
        contactId,
        conversationId
      });

      if (!summaryResult.success) {
        return {
          success: false,
          error: summaryResult.error
        };
      }

      // Also check if summarization is currently needed
      const { firestore } = await import('../../../config/firebase');
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      const conversationDoc = await conversationRef.get();
      const conversationData = conversationDoc.exists ? conversationDoc.data() : {};

      const stats = {
        hasSummary: !!summaryResult.summary,
        summaryLength: summaryResult.summary ? summaryResult.summary.length : 0,
        lastUpdated: summaryResult.summaryLastUpdated,
        messagesProcessed: conversationData?.messagesProcessed,
        needsSummarization: conversationData?.needsSummarization || false
      };

      console.log(`  Summarization stats:`, stats);

      return {
        success: true,
        stats
      };

    } catch (error) {
      console.error('Error getting summarization stats:', error);
      
      return {
        success: false,
        error: `Failed to get summarization stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Force regeneration of summary (for testing or admin use)
   */
  async regenerateSummary(
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageLimit?: number
  ): Promise<SummarizeConversationResult> {
    try {
      console.log(`= Forcing summary regeneration for conversation ${conversationId}`);

      return await this.summarizeConversation({
        tenantId,
        contactId,
        conversationId,
        messageLimit
      });

    } catch (error) {
      console.error('Error regenerating summary:', error);

      return {
        success: false,
        error: `Failed to regenerate summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Specialized method for summarizing phone call transcripts
   * Processes phone transcript data directly without pulling messages
   */
  private async summarizePhoneCall(request: SummarizeConversationRequest): Promise<SummarizeConversationResult> {
    try {
      console.log('📞 Starting phone call transcript summarization pipeline');
      console.log(`  - Conversation ID: ${request.conversationId}`);
      console.log(`  - Transcript entries: ${request.phoneTranscriptData?.transcript?.length || 0}`);

      if (!request.phoneTranscriptData) {
        return {
          success: false,
          error: 'Phone transcript data is required for phone call summarization'
        };
      }

      // Step 1: Summarize the phone transcript using Claude 4
      console.log('\n= Step 1: Summarizing phone transcript');
      const transcriptSummaryResult = await summarizePhoneTranscript({
        transcript: request.phoneTranscriptData.transcript,
        callDuration: request.phoneTranscriptData.duration,
        analysis: request.phoneTranscriptData.analysis,
        metadata: request.phoneTranscriptData.metadata,
        direction: request.phoneTranscriptData.direction
      });

      if (!transcriptSummaryResult.success) {
        console.error('❌ Failed to summarize phone transcript:', transcriptSummaryResult.error);
        return {
          success: false,
          error: transcriptSummaryResult.error
        };
      }

      console.log(`✅ Phone transcript summarized (${transcriptSummaryResult.summary.length} characters)`);

      // Step 2: Pull existing summary if available
      console.log('\n= Step 2: Pulling existing conversation summary');
      const existingSummaryResult = await pullExistingSummary.getSummary({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId
      });

      if (!existingSummaryResult.success) {
        return {
          success: false,
          error: existingSummaryResult.error
        };
      }

      const hasPreviousSummary = !!existingSummaryResult.summary;
      console.log(`  Previous summary: ${hasPreviousSummary ? 'FOUND' : 'NOT FOUND'}`);

      // Step 3: Generate comprehensive summary combining phone call with existing summary
      console.log('\n= Step 3: Generating comprehensive conversation summary');

      let finalSummary: string;

      if (hasPreviousSummary && existingSummaryResult.summary) {
        // Combine existing summary with new phone call summary
        const combinedPrompt = `You have an existing conversation summary and a new phone call that just occurred. Create a comprehensive updated summary that integrates both.

EXISTING CONVERSATION SUMMARY:
${existingSummaryResult.summary}

---

NEW PHONE CALL:
${transcriptSummaryResult.summary}

---

Please create a comprehensive updated summary that:
1. Integrates the phone call context with the existing conversation history
2. Maintains chronological flow
3. Highlights any new developments or resolutions from the call
4. Keeps it concise (200-300 words)

Return only the updated summary, no additional commentary.`;

        const { claude4 } = await import('../../../llmModels/claude4');
        finalSummary = await claude4.processText(combinedPrompt);
        console.log(`✅ Combined summary generated (${finalSummary.length} characters)`);
      } else {
        // Use phone call summary as the primary summary
        finalSummary = transcriptSummaryResult.summary;
        console.log(`✅ Using phone call summary as primary summary`);
      }

      // Step 4: Save the summary to Firestore
      console.log('\n= Step 4: Saving summary to Firestore');
      const saveResult = await saveSummary.saveSummary({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        summary: finalSummary,
        messagesProcessed: 1, // Phone call counts as 1 message
        previousSummaryIncluded: hasPreviousSummary
      });

      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        };
      }

      console.log('✅ Phone call summarization pipeline completed successfully');
      console.log(`  Final summary length: ${finalSummary.length} characters`);

      // Step 5: Trigger background contact profile analysis (fire and forget)
      console.log('\n📋 Step 5: Triggering background contact profile analysis');

      // Create a pseudo-message object for profile analysis
      const pseudoMessages = [{
        id: `phone_${request.conversationId}`,
        tenant_id: request.tenantId,
        conversation_id: request.conversationId,
        direction: request.phoneTranscriptData.direction || 'inbound' as const,
        provider_msg_id: request.conversationId,
        from_norm: 'phone',
        to_norm: 'agent',
        body: transcriptSummaryResult.summary,
        status: 'completed',
        created_at: { toDate: () => new Date() } as any,
        agent_id: undefined
      }];

      triggerContactProfileAnalysisBackground({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationSummary: finalSummary,
        recentMessages: pseudoMessages
      });

      return {
        success: true,
        summary: finalSummary,
        summaryLength: finalSummary.length,
        messagesProcessed: 1,
        previousSummaryIncluded: hasPreviousSummary
      };

    } catch (error) {
      console.error('❌ Error in phone call summarization pipeline:', error);

      return {
        success: false,
        error: `Phone call summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const summarizeHistoryService = new SummarizeHistoryService();