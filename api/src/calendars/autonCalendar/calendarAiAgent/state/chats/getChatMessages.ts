/**
 * Get Chat Messages Service
 * Retrieves all messages for a chat (defaults to current chat)
 */

import { firestore } from '../../../../../config/firebase';
import { getCurrentState } from '../utils/getCurrentState';
import { Message } from './createMessage';

/**
 * Get all messages for a chat
 * If no chatId provided, uses current chat from state
 *
 * @param tenantId - The tenant ID
 * @param chatId - Optional chat ID (defaults to current chat)
 * @param limit - Optional limit for pagination
 * @returns Array of messages in chronological order
 */
export async function getChatMessages(
  tenantId: string,
  chatId?: string,
  limit?: number
): Promise<Message[]> {
  try {
    // If no chatId provided, get current chat from state
    let targetChatId = chatId;

    if (!targetChatId) {
      const state = await getCurrentState(tenantId);
      if (!state.currentChatId) {
        console.log(`9 No current chat set for tenant ${tenantId}`);
        return [];
      }
      targetChatId = state.currentChatId;
    }

    console.log(`=ì Fetching messages for chat: ${targetChatId}`);

    let query = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(targetChatId)
      .collection('messages')
      .orderBy('createdAt', 'asc');

    // Apply limit if provided
    if (limit) {
      query = query.limit(limit) as any;
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`9 No messages found for chat ${targetChatId}`);
      return [];
    }

    const messages: Message[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Message;
      return {
        ...data,
        createdAt: data.createdAt instanceof Date
          ? data.createdAt
          : (data.createdAt as any).toDate()
      };
    });

    console.log(` Found ${messages.length} messages for chat ${targetChatId}`);

    return messages;
  } catch (error) {
    console.error('L Error getting chat messages:', error);
    throw new Error('Failed to get chat messages');
  }
}
