import { firestore } from '../../../../config/firebase';
import { Message } from './pullLatestMessages';
import admin from 'firebase-admin';

/**
 * Service module for intelligent history truncation
 * Trims messages if they exceed character limit and marks conversation for summarization
 */

export interface HistoryTruncationRequest {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messages: Message[];
  characterLimit: number; // Default: 8000 characters
}

export interface HistoryTruncationResult {
  success: boolean;
  messages: Message[];
  wasTruncated: boolean;
  charactersRemoved: number;
  originalMessageCount: number;
  finalMessageCount: number;
  error?: string;
}

export class HistoryTruncation {
  /**
   * Truncate message history if it exceeds the character limit
   * Removes oldest messages first and marks conversation for summarization
   */
  async truncateIfNeeded(request: HistoryTruncationRequest): Promise<HistoryTruncationResult> {
    try {
      console.log(`= Checking if truncation needed (limit: ${request.characterLimit} chars)`);

      const originalMessageCount = request.messages.length;

      // Calculate total character count of all messages
      const totalCharacters = this.calculateTotalCharacters(request.messages);
      console.log(`  Current message content: ${totalCharacters} characters`);

      // If under limit, no truncation needed
      if (totalCharacters <= request.characterLimit) {
        console.log('   Under character limit - no truncation needed');
        
        return {
          success: true,
          messages: request.messages,
          wasTruncated: false,
          charactersRemoved: 0,
          originalMessageCount,
          finalMessageCount: originalMessageCount
        };
      }

      console.log('    Over character limit - truncation required');

      // Truncate messages from the beginning (oldest first)
      const truncationResult = this.truncateFromOldest(request.messages, request.characterLimit);

      // Mark conversation for summarization if truncation occurred
      if (truncationResult.wasTruncated) {
        console.log('  =Ý Marking conversation for summarization');
        
        await this.markForSummarization(
          request.tenantId,
          request.contactId,
          request.conversationId
        );
      }

      console.log(`   Truncation complete:`);
      console.log(`    - Original messages: ${originalMessageCount}`);
      console.log(`    - Final messages: ${truncationResult.messages.length}`);
      console.log(`    - Characters removed: ${truncationResult.charactersRemoved}`);

      return {
        success: true,
        messages: truncationResult.messages,
        wasTruncated: truncationResult.wasTruncated,
        charactersRemoved: truncationResult.charactersRemoved,
        originalMessageCount,
        finalMessageCount: truncationResult.messages.length
      };

    } catch (error) {
      console.error('L Error in history truncation:', error);
      
      return {
        success: false,
        messages: request.messages, // Return original messages on error
        wasTruncated: false,
        charactersRemoved: 0,
        originalMessageCount: request.messages.length,
        finalMessageCount: request.messages.length,
        error: `History truncation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Calculate total character count of message bodies
   */
  private calculateTotalCharacters(messages: Message[]): number {
    return messages.reduce((total, message) => total + (message.body?.length || 0), 0);
  }

  /**
   * Truncate messages from oldest first until under character limit
   */
  private truncateFromOldest(
    messages: Message[],
    characterLimit: number
  ): { messages: Message[]; wasTruncated: boolean; charactersRemoved: number } {
    
    const messagesCopy = [...messages]; // Don't mutate original array
    let currentCharacters = this.calculateTotalCharacters(messagesCopy);
    let charactersRemoved = 0;
    let removedCount = 0;

    // Remove messages from the beginning (oldest) until under limit
    while (currentCharacters > characterLimit && messagesCopy.length > 1) {
      const removedMessage = messagesCopy.shift(); // Remove first (oldest) message
      if (removedMessage) {
        const removedChars = removedMessage.body?.length || 0;
        charactersRemoved += removedChars;
        currentCharacters -= removedChars;
        removedCount++;
      }
    }

    console.log(`    - Removed ${removedCount} oldest messages`);
    console.log(`    - Removed ${charactersRemoved} characters`);
    console.log(`    - Final character count: ${currentCharacters}`);

    return {
      messages: messagesCopy,
      wasTruncated: removedCount > 0,
      charactersRemoved
    };
  }

  /**
   * Mark conversation document for summarization
   */
  private async markForSummarization(
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

      // Update conversation document with summarization flag
      await conversationRef.update({
        needsSummarization: true,
        truncatedAt: admin.firestore.Timestamp.now()
      });

      console.log('     Conversation marked for summarization');

    } catch (error) {
      console.error('    L Failed to mark conversation for summarization:', error);
      // Don't throw - this is not critical for the main flow
    }
  }

  /**
   * Get truncation statistics for a conversation
   */
  async getTruncationStats(
    tenantId: string,
    contactId: string,
    conversationId: string
  ): Promise<{
    success: boolean;
    needsSummarization: boolean;
    truncatedAt?: FirebaseFirestore.Timestamp;
    error?: string;
  }> {
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
          success: false,
          needsSummarization: false,
          error: 'Conversation not found'
        };
      }

      const data = conversationDoc.data();

      return {
        success: true,
        needsSummarization: data?.needsSummarization || false,
        truncatedAt: data?.truncatedAt
      };

    } catch (error) {
      console.error('Error getting truncation stats:', error);
      
      return {
        success: false,
        needsSummarization: false,
        error: `Failed to get truncation stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const historyTruncation = new HistoryTruncation();