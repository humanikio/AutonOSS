import { firestore } from '../../../../config/firebase';
import { summarizeHistoryService } from '../summarizeHistory';
import admin from 'firebase-admin';

/**
 * Service module for background summarization checks
 * Runs after responses are sent to check if summarization is needed
 */

export interface SummarizationCheckRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
}

export interface SummarizationCheckResult {
  success: boolean;
  needsSummarization: boolean;
  summarizationTriggered: boolean;
  error?: string;
}

export class SummarizationCheck {
  /**
   * Check if conversation needs summarization and trigger if needed
   * This is designed to run as background processing after response is sent
   */
  async checkAndSummarize(request: SummarizationCheckRequest): Promise<SummarizationCheckResult> {
    try {
      console.log(`= Background summarization check for conversation ${request.conversationId}`);

      // Step 1: Check if conversation is marked for summarization
      const needsCheck = await this.checkSummarizationFlag(
        request.tenantId,
        request.contactId,
        request.conversationId
      );

      if (!needsCheck.success) {
        return {
          success: false,
          needsSummarization: false,
          summarizationTriggered: false,
          error: needsCheck.error
        };
      }

      if (!needsCheck.needsSummarization) {
        console.log('   No summarization needed');
        return {
          success: true,
          needsSummarization: false,
          summarizationTriggered: false
        };
      }

      console.log('  =Ý Summarization needed - clearing flag and triggering process');

      // Step 2: Clear the summarization flag immediately to prevent concurrent processing
      await this.clearSummarizationFlag(
        request.tenantId,
        request.contactId,
        request.conversationId
      );

      // Step 3: Trigger summarization process
      console.log('  =€ Triggering summarization service');
      
      const summarizationResult = await summarizeHistoryService.summarizeConversation({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId
      });

      if (!summarizationResult.success) {
        console.error('  L Summarization failed:', summarizationResult.error);
        // Re-set the flag since summarization failed
        await this.setSummarizationFlag(
          request.tenantId,
          request.contactId,
          request.conversationId
        );
        
        return {
          success: false,
          needsSummarization: true,
          summarizationTriggered: true,
          error: `Summarization process failed: ${summarizationResult.error}`
        };
      }

      console.log('   Background summarization completed successfully');

      return {
        success: true,
        needsSummarization: true,
        summarizationTriggered: true
      };

    } catch (error) {
      console.error('L Error in background summarization check:', error);
      
      return {
        success: false,
        needsSummarization: false,
        summarizationTriggered: false,
        error: `Summarization check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if conversation has summarization flag set
   */
  private async checkSummarizationFlag(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{ success: boolean; needsSummarization: boolean; error?: string }> {
    try {
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
          needsSummarization: false
        };
      }

      const data = conversationDoc.data();
      const needsSummarization = data?.needsSummarization || false;

      return {
        success: true,
        needsSummarization
      };

    } catch (error) {
      console.error('Error checking summarization flag:', error);
      
      return {
        success: false,
        needsSummarization: false,
        error: `Failed to check summarization flag: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clear the summarization flag
   */
  private async clearSummarizationFlag(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        needsSummarization: false,
        summarizationStartedAt: admin.firestore.Timestamp.now()
      });

      console.log('     Summarization flag cleared');

    } catch (error) {
      console.error('    L Failed to clear summarization flag:', error);
      throw error;
    }
  }

  /**
   * Set the summarization flag (used when summarization fails)
   */
  private async setSummarizationFlag(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const conversationRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('contacts')
        .doc(contactId)
        .collection('conversations')
        .doc(conversationId);

      await conversationRef.update({
        needsSummarization: true,
        summarizationFailedAt: admin.firestore.Timestamp.now()
      });

      console.log('      Summarization flag re-set due to failure');

    } catch (error) {
      console.error('    L Failed to set summarization flag:', error);
      // Don't throw - this is cleanup after already failed summarization
    }
  }

  /**
   * Manual trigger for summarization (for testing or admin use)
   */
  async forceSummarization(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<SummarizationCheckResult> {
    try {
      console.log(`= Forcing summarization for conversation ${conversationId}`);

      // Set the flag and then run check
      await this.setSummarizationFlag(tenantId, contactId, conversationId);
      
      return await this.checkAndSummarize({
        tenantId,
        contactId,
        conversationId
      });

    } catch (error) {
      console.error('Error forcing summarization:', error);
      
      return {
        success: false,
        needsSummarization: false,
        summarizationTriggered: false,
        error: `Failed to force summarization: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const summarizationCheck = new SummarizationCheck();