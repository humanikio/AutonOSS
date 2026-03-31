import { firestore } from '../../../config/firebase';
import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for saving training messages to Firestore
 */

export interface TrainingMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: FirebaseFirestore.Timestamp;
  metadata?: {
    agentId?: string;
    caseId?: string;
    analysisId?: string;
    ragUsed?: boolean;
    documentsUsed?: number;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface SaveMessageRequest {
  tenantId: string;
  sessionId: string;
  message: {
    sender: 'user' | 'agent';
    content: string;
    metadata?: any;
  };
}

export interface SaveMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SaveTrainingMessageService {
  /**
   * Save a message to the training session
   */
  async saveMessage(request: SaveMessageRequest): Promise<SaveMessageResponse> {
    try {
      const { tenantId, sessionId, message } = request;
      
      console.log(`=� Saving training message for session ${sessionId}`);
      console.log(`  - Sender: ${message.sender}`);
      console.log(`  - Content: "${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}"`);

      // Generate message ID
      const messageId = uuidv4();

      // Verify training session exists
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) {
        console.error(`Training session ${sessionId} not found`);
        return {
          success: false,
          error: 'Training session not found'
        };
      }

      // Create message document
      const messageData: TrainingMessage = {
        id: messageId,
        sessionId,
        sender: message.sender,
        content: message.content,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: message.metadata
      };

      // Save message to messages subcollection
      const messageRef = sessionRef
        .collection('messages')
        .doc(messageId);

      await messageRef.set(messageData);

      // Update session with latest message timestamp and increment message count
      const sessionData = sessionDoc.data()!;
      const currentMessageCount = sessionData.stats?.messageCount || 0;
      const currentMessages = sessionData.messages || [];
      
      // Add the new message to the messages array in the main document
      const newMessage = {
        id: messageId,
        sender: message.sender,
        content: message.content,
        timestamp: admin.firestore.Timestamp.now().toDate().toISOString(),
        metadata: message.metadata
      };
      
      await sessionRef.update({
        messages: [...currentMessages, newMessage],
        lastMessageAt: admin.firestore.Timestamp.now(),
        'stats.messageCount': currentMessageCount + 1,
        'stats.lastMessageSender': message.sender,
        updatedAt: admin.firestore.Timestamp.now()
      });

      console.log(` Training message saved successfully with ID: ${messageId}`);

      return {
        success: true,
        messageId
      };

    } catch (error) {
      console.error('Error saving training message:', error);
      
      return {
        success: false,
        error: `Failed to save training message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Save multiple messages in batch (useful for conversation history)
   */
  async saveMessageBatch(
    tenantId: string,
    sessionId: string,
    messages: Array<{
      sender: 'user' | 'agent';
      content: string;
      metadata?: any;
    }>
  ): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
    try {
      console.log(`=� Saving batch of ${messages.length} training messages for session ${sessionId}`);

      const batch = firestore.batch();
      const messageIds: string[] = [];
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      // Verify session exists
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) {
        return {
          success: false,
          error: 'Training session not found'
        };
      }

      // Create all message documents
      const timestamp = admin.firestore.Timestamp.now();
      
      messages.forEach((message) => {
        const messageId = uuidv4();
        messageIds.push(messageId);
        
        const messageRef = sessionRef
          .collection('messages')
          .doc(messageId);

        const messageData: TrainingMessage = {
          id: messageId,
          sessionId,
          sender: message.sender,
          content: message.content,
          timestamp,
          metadata: message.metadata
        };

        batch.set(messageRef, messageData);
      });

      // Update session stats and messages array
      const sessionData = sessionDoc.data()!;
      const currentMessageCount = sessionData.stats?.messageCount || 0;
      const currentMessages = sessionData.messages || [];
      
      // Convert messages to the format expected by the frontend
      const newMessages = messages.map((message, index) => ({
        id: messageIds[index],
        sender: message.sender,
        content: message.content,
        timestamp: timestamp.toDate().toISOString(),
        metadata: message.metadata
      }));
      
      batch.update(sessionRef, {
        messages: [...currentMessages, ...newMessages],
        lastMessageAt: timestamp,
        'stats.messageCount': currentMessageCount + messages.length,
        'stats.lastMessageSender': messages[messages.length - 1].sender,
        updatedAt: timestamp
      });

      // Commit the batch
      await batch.commit();

      console.log(` Saved ${messages.length} training messages successfully`);

      return {
        success: true,
        messageIds
      };

    } catch (error) {
      console.error('Error saving message batch:', error);
      
      return {
        success: false,
        error: `Failed to save message batch: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const saveTrainingMessageService = new SaveTrainingMessageService();