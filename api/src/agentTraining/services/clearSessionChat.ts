import { firestore } from '../../config/firebase';
import admin from 'firebase-admin';

/**
 * Service to clear chat messages from a training session
 * Keeps session configuration and test agent data intact
 */

export interface ClearSessionChatRequest {
  tenantId: string;
  sessionId: string;
}

export interface ClearSessionChatResult {
  success: boolean;
  messagesCleared: number;
  error?: string;
}

export class ClearSessionChatService {
  /**
   * Clear all messages from a training session while preserving configs
   */
  async clearSessionChat(request: ClearSessionChatRequest): Promise<ClearSessionChatResult> {
    try {
      console.log(`>� Starting chat clear for session: ${request.sessionId}`);
      console.log(`  - Tenant ID: ${request.tenantId}`);

      // Get reference to messages subcollection
      const messagesRef = firestore
        .collection('tenants').doc(request.tenantId)
        .collection('trainingSessions').doc(request.sessionId)
        .collection('messages');

      // Get all messages to count them before deletion
      const messagesSnapshot = await messagesRef.get();
      const messageCount = messagesSnapshot.size;

      console.log(`=� Found ${messageCount} messages to clear`);

      // CRITICAL: Also clear conversation summaries from Universal Memory
      console.log(`🧹 Clearing conversation summaries for session ${request.sessionId}`);
      try {
        // Clear conversation summaries that might be cached in Universal Memory
        const conversationSummaryRef = firestore
          .collection('conversationSummaries')
          .where('tenant_id', '==', request.tenantId)
          .where('conversation_id', '==', request.sessionId);

        const summarySnapshot = await conversationSummaryRef.get();
        console.log(`📊 Found ${summarySnapshot.size} conversation summaries to clear`);

        if (!summarySnapshot.empty) {
          const summaryBatch = firestore.batch();
          summarySnapshot.docs.forEach((doc) => {
            summaryBatch.delete(doc.ref);
          });
          await summaryBatch.commit();
          console.log(`✅ Cleared ${summarySnapshot.size} conversation summaries`);
        }
      } catch (summaryError) {
        console.warn('⚠️ Could not clear conversation summaries (may not exist):', summaryError);
      }

      if (messageCount === 0) {
        console.log(' No messages to clear');
        return {
          success: true,
          messagesCleared: 0
        };
      }

      // Delete all messages in batches (Firestore batch limit is 500)
      const batch = firestore.batch();
      let deletedCount = 0;

      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Execute the batch delete
      await batch.commit();

      // CRITICAL: Clear the messages array and summary from the main session document
      console.log(`🧹 Clearing messages array and summary from session document`);
      try {
        const sessionRef = firestore
          .collection('tenants').doc(request.tenantId)
          .collection('trainingSessions').doc(request.sessionId);

        await sessionRef.update({
          messages: [], // Clear the messages array in the main document
          'stats.messageCount': 0,
          summary: admin.firestore.FieldValue.delete(), // Remove conversation summary
          lastMessageAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Cleared session document messages array and summary`);
      } catch (sessionError) {
        console.warn('⚠️ Could not clear session document fields:', sessionError);
      }

      // CRITICAL: Also clear analysis cycles that contain conversation context
      console.log(`🧹 Clearing analysis cycles with conversation context`);
      try {
        const analysisCyclesResult = await this.clearAnalysisCycles(request);
        if (analysisCyclesResult.success) {
          console.log(`✅ Cleared ${analysisCyclesResult.messagesCleared} analysis cycles`);
        }
      } catch (analysisError) {
        console.warn('⚠️ Could not clear analysis cycles:', analysisError);
      }

      console.log(`=� Successfully cleared ${deletedCount} messages from session`);
      console.log(` Session configuration and test agent data preserved`);

      return {
        success: true,
        messagesCleared: deletedCount
      };

    } catch (error) {
      console.error('L Error clearing session chat:', error);
      return {
        success: false,
        messagesCleared: 0,
        error: `Failed to clear chat: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clear all analysis cycles from a training session
   * Optional - can be used to also clear analysis history if needed
   */
  async clearAnalysisCycles(request: ClearSessionChatRequest): Promise<ClearSessionChatResult> {
    try {
      console.log(`= Starting analysis cycles clear for session: ${request.sessionId}`);

      // Get reference to analysis cycles subcollection
      const cyclesRef = firestore
        .collection('tenants').doc(request.tenantId)
        .collection('trainingSessions').doc(request.sessionId)
        .collection('analysisCycles');

      // Get all cycles to count them before deletion
      const cyclesSnapshot = await cyclesRef.get();
      const cycleCount = cyclesSnapshot.size;

      console.log(`=� Found ${cycleCount} analysis cycles to clear`);

      if (cycleCount === 0) {
        return {
          success: true,
          messagesCleared: 0
        };
      }

      // Delete all cycles in batches
      const batch = firestore.batch();
      let deletedCount = 0;

      cyclesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Execute the batch delete
      await batch.commit();

      console.log(`=� Successfully cleared ${deletedCount} analysis cycles from session`);

      return {
        success: true,
        messagesCleared: deletedCount
      };

    } catch (error) {
      console.error('L Error clearing analysis cycles:', error);
      return {
        success: false,
        messagesCleared: 0,
        error: `Failed to clear analysis cycles: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Reset session analytics/metadata (message counts, etc.)
   */
  async resetSessionMetadata(request: ClearSessionChatRequest): Promise<boolean> {
    try {
      console.log(`=� Resetting session metadata for: ${request.sessionId}`);

      const sessionRef = firestore
        .collection('tenants').doc(request.tenantId)
        .collection('trainingSessions').doc(request.sessionId);

      // Reset relevant metadata fields
      await sessionRef.update({
        messageCount: 0,
        lastActivity: new Date().toISOString(),
        cycleCount: 0,
        // Keep other fields like createdAt, agentId, mode, etc.
      });

      console.log(' Session metadata reset successfully');
      return true;

    } catch (error) {
      console.error('L Error resetting session metadata:', error);
      return false;
    }
  }
}

export const clearSessionChatService = new ClearSessionChatService();