/**
 * Get Current Chat Service
 * Retrieves the currently active chat session
 */

import { firestore } from '../../../../../config/firebase';
import { getCurrentState } from '../utils/getCurrentState';
import { Chat } from './createChat';

/**
 * Get the currently active chat
 * Uses getCurrentState util to find the current chatId
 *
 * @param tenantId - The tenant ID
 * @returns The current chat or null if no chat is active
 */
export async function getCurrentChat(tenantId: string): Promise<Chat | null> {
  try {
    // Get current state to find active chat ID
    const state = await getCurrentState(tenantId);

    if (!state.currentChatId) {
      console.log(`9 No current chat set for tenant ${tenantId}`);
      return null;
    }

    const chatRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(state.currentChatId);

    const doc = await chatRef.get();

    if (!doc.exists) {
      console.log(`L Current chat not found: ${state.currentChatId}`);
      return null;
    }

    const data = doc.data() as Chat;

    // Convert Firestore Timestamps to Date objects
    return {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any).toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any).toDate(),
      lastMessageAt: data.lastMessageAt
        ? (data.lastMessageAt instanceof Date ? data.lastMessageAt : (data.lastMessageAt as any).toDate())
        : undefined
    };
  } catch (error) {
    console.error('L Error getting current chat:', error);
    throw new Error('Failed to get current chat');
  }
}
