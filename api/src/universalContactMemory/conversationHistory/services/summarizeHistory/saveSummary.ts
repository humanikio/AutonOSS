import { firestore } from '../../../../config/firebase';
import admin from 'firebase-admin';

/**
 * Sub-module for saving conversation summaries to Firestore
 * Handles persistent storage of generated summaries with metadata
 */

export interface SaveSummaryRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  summary: string;
  messagesProcessed: number;
  previousSummaryIncluded?: boolean;
}

export interface SaveSummaryResult {
  success: boolean;
  summaryId?: string;
  error?: string;
}

export class SaveSummary {
  /**
   * Save conversation summary to Firestore conversation document
   */
  async saveSummary(request: SaveSummaryRequest): Promise<SaveSummaryResult> {
    try {
      console.log(`= Saving summary to Firestore`);
      console.log(`  - Summary length: ${request.summary.length} characters`);
      console.log(`  - Messages processed: ${request.messagesProcessed}`);

      const conversationRef = firestore
        .collection('tenants')
        .doc(request.tenantId)
        .collection('contacts')
        .doc(request.contactId)
        .collection('conversations')
        .doc(request.conversationId);

      // Prepare summary data
      const summaryData = {
        chatSummary: request.summary,
        summaryLastUpdated: admin.firestore.Timestamp.now(),
        messagesProcessed: request.messagesProcessed,
        summaryLength: request.summary.length,
        previousSummaryIncluded: request.previousSummaryIncluded || false,
        summaryVersion: this.generateSummaryVersion(),
        // Clear any summarization flags
        needsSummarization: false,
        summarizationCompletedAt: admin.firestore.Timestamp.now()
      };

      // Update conversation document
      await conversationRef.update(summaryData);

      console.log(`  ✅ Summary saved successfully`);
      console.log(`    - Conversation ID: ${request.conversationId}`);
      console.log(`    - Summary version: ${summaryData.summaryVersion}`);

      return {
        success: true,
        summaryId: request.conversationId
      };

    } catch (error) {
      console.error('❌ Error saving summary to Firestore:', error);
      
      return {
        success: false,
        error: `Failed to save summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Save summary with backup to separate collection for audit trail
   */
  async saveSummaryWithBackup(request: SaveSummaryRequest): Promise<SaveSummaryResult> {
    try {
      console.log(`= Saving summary with backup`);

      // First save to conversation document
      const mainSaveResult = await this.saveSummary(request);
      
      if (!mainSaveResult.success) {
        return mainSaveResult;
      }

      // Create backup in separate collection
      try {
        await this.createSummaryBackup(request);
        console.log(`  ✅ Summary backup created`);
      } catch (backupError) {
        console.warn('  ⚠️ Failed to create summary backup (non-critical):', backupError);
        // Don't fail the main operation if backup fails
      }

      return mainSaveResult;

    } catch (error) {
      console.error('❌ Error saving summary with backup:', error);
      
      return {
        success: false,
        error: `Failed to save summary with backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create backup of summary in separate collection
   */
  private async createSummaryBackup(request: SaveSummaryRequest): Promise<void> {
    const backupRef = firestore
      .collection('conversation_summary_backups')
      .doc(`${request.tenantId}_${request.conversationId}_${Date.now()}`);

    const backupData = {
      tenantId: request.tenantId,
      contactId: request.contactId,
      conversationId: request.conversationId,
      summary: request.summary,
      messagesProcessed: request.messagesProcessed,
      previousSummaryIncluded: request.previousSummaryIncluded || false,
      summaryLength: request.summary.length,
      createdAt: admin.firestore.Timestamp.now(),
      version: this.generateSummaryVersion()
    };

    await backupRef.set(backupData);
  }

  /**
   * Generate a version identifier for the summary
   */
  private generateSummaryVersion(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `v${timestamp}`;
  }

  /**
   * Update summary metadata without changing the summary content
   */
  async updateSummaryMetadata(
    tenantId: string,
    contactId: string,
    conversationId: string,
    metadata: {
      lastAccessed?: FirebaseFirestore.Timestamp;
      accessCount?: number;
      qualityRating?: number;
      tags?: string[];
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`= Updating summary metadata for conversation ${conversationId}`);

      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      // Build update object with only defined metadata fields
      const updateData: any = {
        summaryMetadataUpdatedAt: admin.firestore.Timestamp.now()
      };

      if (metadata.lastAccessed) updateData.summaryLastAccessed = metadata.lastAccessed;
      if (metadata.accessCount !== undefined) updateData.summaryAccessCount = metadata.accessCount;
      if (metadata.qualityRating !== undefined) updateData.summaryQualityRating = metadata.qualityRating;
      if (metadata.tags) updateData.summaryTags = metadata.tags;

      await conversationRef.update(updateData);

      console.log(`  ✅ Summary metadata updated`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating summary metadata:', error);
      
      return {
        success: false,
        error: `Failed to update summary metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete summary from conversation
   */
  async deleteSummary(
    tenantId: string,
    contactId: string,
    conversationId: string,
    createBackup: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`= Deleting summary for conversation ${conversationId}`);

      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      // Get current summary for backup if requested
      if (createBackup) {
        const conversationDoc = await conversationRef.get();
        if (conversationDoc.exists) {
          const data = conversationDoc.data();
          if (data?.chatSummary) {
            await this.createSummaryBackup({
              tenantId,
              contactId,
              conversationId,
              summary: data.chatSummary,
              messagesProcessed: data.messagesProcessed || 0,
              previousSummaryIncluded: data.previousSummaryIncluded || false
            });
            console.log(`  ✅ Backup created before deletion`);
          }
        }
      }

      // Remove summary fields
      await conversationRef.update({
        chatSummary: admin.firestore.FieldValue.delete(),
        summaryLastUpdated: admin.firestore.FieldValue.delete(),
        messagesProcessed: admin.firestore.FieldValue.delete(),
        summaryLength: admin.firestore.FieldValue.delete(),
        previousSummaryIncluded: admin.firestore.FieldValue.delete(),
        summaryVersion: admin.firestore.FieldValue.delete(),
        summaryDeletedAt: admin.firestore.Timestamp.now()
      });

      console.log(`  ✅ Summary deleted successfully`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error deleting summary:', error);
      
      return {
        success: false,
        error: `Failed to delete summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get summary history/versions for a conversation
   */
  async getSummaryHistory(
    tenantId: string,
    conversationId: string,
    limit: number = 10
  ): Promise<{
    success: boolean;
    history?: Array<{
      version: string;
      summary: string;
      createdAt: FirebaseFirestore.Timestamp;
      messagesProcessed: number;
    }>;
    error?: string;
  }> {
    try {
      console.log(`= Getting summary history for conversation ${conversationId}`);

      const backupsQuery = firestore
        .collection('conversation_summary_backups')
        .where('tenantId', '==', tenantId)
        .where('conversationId', '==', conversationId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      const backupsSnapshot = await backupsQuery.get();

      const history = backupsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          version: data.version,
          summary: data.summary,
          createdAt: data.createdAt,
          messagesProcessed: data.messagesProcessed
        };
      });

      console.log(`  Found ${history.length} summary versions`);

      return {
        success: true,
        history
      };

    } catch (error) {
      console.error('❌ Error getting summary history:', error);
      
      return {
        success: false,
        error: `Failed to get summary history: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const saveSummary = new SaveSummary();