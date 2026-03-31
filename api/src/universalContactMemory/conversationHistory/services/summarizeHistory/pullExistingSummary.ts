import { firestore } from '../../../../config/firebase';

/**
 * Sub-module for pulling existing conversation summaries for summarization context
 * Used when updating/enhancing existing summaries
 */

export interface PullExistingSummaryRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
}

export interface PullExistingSummaryResult {
  success: boolean;
  summary: string | null;
  summaryLastUpdated?: FirebaseFirestore.Timestamp;
  messagesProcessed?: number;
  error?: string;
}

export class PullExistingSummary {
  /**
   * Pull existing conversation summary from Firestore for summarization context
   */
  async getSummary(request: PullExistingSummaryRequest): Promise<PullExistingSummaryResult> {
    try {
      console.log(`= Pulling existing summary for summarization context`);

      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        console.log('  📝 No conversation document found - will create new summary');
        return {
          success: true,
          summary: null
        };
      }

      const data = conversationDoc.data();
      const summary = data?.chatSummary || null;
      const summaryLastUpdated = data?.summaryLastUpdated || null;
      const messagesProcessed = data?.messagesProcessed || null;

      if (summary) {
        console.log(`  ✅ Existing summary found:`);
        console.log(`    - Length: ${summary.length} characters`);
        console.log(`    - Last updated: ${summaryLastUpdated ? summaryLastUpdated.toDate().toISOString() : 'Unknown'}`);
        console.log(`    - Messages processed: ${messagesProcessed || 'Unknown'}`);
      } else {
        console.log('  📝 No existing summary found - will create new summary');
      }

      return {
        success: true,
        summary,
        summaryLastUpdated,
        messagesProcessed
      };

    } catch (error) {
      console.error('❌ Error pulling existing summary:', error);
      
      return {
        success: false,
        summary: null,
        error: `Failed to pull existing summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get detailed summary metadata for analysis
   */
  async getSummaryMetadata(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{
    success: boolean;
    metadata?: {
      hasSummary: boolean;
      summaryLength: number;
      lastUpdated?: FirebaseFirestore.Timestamp;
      messagesProcessed?: number;
      summaryAge?: number; // Minutes since last update
      isStale?: boolean; // True if summary is older than 24 hours
    };
    error?: string;
  }> {
    try {
      const result = await this.getSummary({ tenantId, contactId, conversationId });
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      const now = Date.now();
      const summaryAge = result.summaryLastUpdated 
        ? Math.round((now - result.summaryLastUpdated.toMillis()) / (1000 * 60)) // minutes
        : undefined;

      const isStale = summaryAge ? summaryAge > (24 * 60) : false; // 24 hours

      const metadata = {
        hasSummary: !!result.summary,
        summaryLength: result.summary ? result.summary.length : 0,
        lastUpdated: result.summaryLastUpdated,
        messagesProcessed: result.messagesProcessed,
        summaryAge,
        isStale
      };

      console.log(`  📊 Summary metadata:`, metadata);

      return {
        success: true,
        metadata
      };

    } catch (error) {
      console.error('Error getting summary metadata:', error);
      
      return {
        success: false,
        error: `Failed to get summary metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if summary needs updating based on message count
   */
  async shouldUpdateSummary(
    tenantId: string,
    contactId: string,
    conversationId: string,
    currentMessageCount: number
  ): Promise<{
    success: boolean;
    shouldUpdate: boolean;
    reason?: string;
    error?: string;
  }> {
    try {
      const result = await this.getSummary({ tenantId, contactId, conversationId });
      
      if (!result.success) {
        return {
          success: false,
          shouldUpdate: false,
          error: result.error
        };
      }

      // No existing summary - should create one
      if (!result.summary) {
        return {
          success: true,
          shouldUpdate: true,
          reason: 'No existing summary found'
        };
      }

      // Check if significant new messages since last summarization
      const messagesProcessed = result.messagesProcessed || 0;
      const newMessages = currentMessageCount - messagesProcessed;

      if (newMessages >= 10) {
        return {
          success: true,
          shouldUpdate: true,
          reason: `${newMessages} new messages since last summary`
        };
      }

      // Check if summary is stale (older than 7 days with any new messages)
      const metadata = await this.getSummaryMetadata(tenantId, contactId, conversationId);
      if (metadata.success && metadata.metadata?.summaryAge) {
        const daysSinceUpdate = metadata.metadata.summaryAge / (60 * 24);
        if (daysSinceUpdate > 7 && newMessages > 0) {
          return {
            success: true,
            shouldUpdate: true,
            reason: `Summary is ${Math.round(daysSinceUpdate)} days old with ${newMessages} new messages`
          };
        }
      }

      return {
        success: true,
        shouldUpdate: false,
        reason: 'Summary is up to date'
      };

    } catch (error) {
      console.error('Error checking if summary should update:', error);
      
      return {
        success: false,
        shouldUpdate: false,
        error: `Failed to check summary update status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const pullExistingSummary = new PullExistingSummary();