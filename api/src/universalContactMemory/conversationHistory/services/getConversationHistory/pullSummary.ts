import { firestore } from '../../../../config/firebase';

/**
 * Service module for pulling existing conversation summaries
 * Retrieves stored chat summaries from conversation documents
 */

export interface PullSummaryRequest {
  tenantId: string;
  contactId?: string;        // Required for production mode
  conversationId?: string;   // Required for production mode
  sessionId?: string;        // Required for training mode
  isTraining?: boolean;      // Flag to indicate training mode
}

export interface PullSummaryResult {
  success: boolean;
  summary: string | null;
  summaryLastUpdated?: FirebaseFirestore.Timestamp;
  error?: string;
}

export class PullSummary {
  /**
   * Pull existing conversation summary from Firestore
   */
  async getSummary(request: PullSummaryRequest): Promise<PullSummaryResult> {
    try {
      if (request.isTraining && request.sessionId) {
        return this.getTrainingSummary(request);
      } else {
        return this.getProductionSummary(request);
      }
    } catch (error) {
      console.error('❌ Error pulling summary:', error);
      
      return {
        success: false,
        summary: null,
        error: `Failed to pull summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Pull summary from production conversation
   */
  private async getProductionSummary(request: PullSummaryRequest): Promise<PullSummaryResult> {
    try {
      console.log(`= Pulling summary for conversation ${request.conversationId}`);

      // Get conversation document reference
      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId!)
        .collection('conversations')
        .doc(request.conversationId!);

      // Fetch conversation document
      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        console.log('  � Conversation document not found');
        return {
          success: true, // Not an error - conversation just doesn't exist yet
          summary: null
        };
      }

      const conversationData = conversationDoc.data();

      // Extract summary fields
      const summary = conversationData?.chatSummary || null;
      const summaryLastUpdated = conversationData?.summaryLastUpdated || null;

      if (summary) {
        console.log(`   Summary found (${summary.length} characters)`);
        console.log(`  =� Last updated: ${summaryLastUpdated ? summaryLastUpdated.toDate().toISOString() : 'Unknown'}`);
      } else {
        console.log('  =� No existing summary found');
      }

      return {
        success: true,
        summary,
        summaryLastUpdated
      };

    } catch (error) {
      console.error('L Error pulling conversation summary:', error);
      
      return {
        success: false,
        summary: null,
        error: `Failed to pull summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Pull summary from training session
   */
  private async getTrainingSummary(request: PullSummaryRequest): Promise<PullSummaryResult> {
    try {
      console.log(`= Pulling summary for training session ${request.sessionId}`);

      // Get training session document reference
      const sessionRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('trainingSessions')
        .doc(request.sessionId!);

      // Fetch training session document
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        console.log('  ⚠️ Training session document not found');
        return {
          success: true, // Not an error - session just doesn't exist yet
          summary: null
        };
      }

      const sessionData = sessionDoc.data();

      // Extract summary from training session document
      const summaryData = sessionData?.summary;
      const summary = summaryData?.content || null;
      const summaryLastUpdated = summaryData?.lastUpdated || summaryData?.createdAt || null;

      if (summary) {
        console.log(`  ✅ Training summary found (${summary.length} characters)`);
        console.log(`  📅 Last updated: ${summaryLastUpdated ? summaryLastUpdated.toDate().toISOString() : 'Unknown'}`);
      } else {
        console.log('  📄 No existing training summary found');
      }

      return {
        success: true,
        summary,
        summaryLastUpdated
      };

    } catch (error) {
      console.error('❌ Error pulling training session summary:', error);
      
      return {
        success: false,
        summary: null,
        error: `Failed to pull training summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if conversation has a summary
   */
  async hasSummary(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{ success: boolean; hasSummary: boolean; error?: string }> {
    try {
      const result = await this.getSummary({ tenantId, contactId, conversationId });
      
      if (!result.success) {
        return {
          success: false,
          hasSummary: false,
          error: result.error
        };
      }

      return {
        success: true,
        hasSummary: !!result.summary
      };

    } catch (error) {
      console.error('Error checking for summary:', error);
      
      return {
        success: false,
        hasSummary: false,
        error: `Failed to check for summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get summary metadata (length, last updated, etc.)
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
      needsSummarization?: boolean;
    };
    error?: string;
  }> {
    try {
      console.log(`= Getting summary metadata for conversation ${conversationId}`);

      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      const conversationDoc = await conversationRef.get();

      if (!conversationDoc.exists) {
        return {
          success: true,
          metadata: {
            hasSummary: false,
            summaryLength: 0,
            needsSummarization: false
          }
        };
      }

      const data = conversationDoc.data();
      const summary = data?.chatSummary || null;

      const metadata = {
        hasSummary: !!summary,
        summaryLength: summary ? summary.length : 0,
        lastUpdated: data?.summaryLastUpdated || undefined,
        needsSummarization: data?.needsSummarization || false
      };

      console.log(`  =� Summary metadata:`, metadata);

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
}

export const pullSummary = new PullSummary();