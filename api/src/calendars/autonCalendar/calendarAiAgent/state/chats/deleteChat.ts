/**
 * Delete Chat Service
 * Deletes a chat session and all its messages
 */

import { firestore } from '../../../../../config/firebase';
import { getCurrentState, updateState } from '../utils/getCurrentState';

/**
 * Delete a chat and all its messages
 * If deleting the current chat, clears currentChatId from state
 *
 * @param tenantId - The tenant ID
 * @param chatId - The chat ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteChat(
  tenantId: string,
  chatId: string
): Promise<boolean> {
  try {
    console.log(`=Ñ Deleting chat: ${chatId}`);

    const chatRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(chatId);

    const doc = await chatRef.get();

    if (!doc.exists) {
      console.log(`L Chat not found: ${chatId}`);
      return false;
    }

    // 1. Delete all messages in the chat (subcollection)
    console.log(`=Ñ Deleting messages for chat ${chatId}`);

    const messagesRef = chatRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();

    if (!messagesSnapshot.empty) {
      // Delete messages in batches
      const batch = firestore.batch();
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(` Deleted ${messagesSnapshot.size} messages`);
    }

    // 2. Delete the chat document
    await chatRef.delete();

    console.log(` Chat deleted: ${chatId}`);

    // 3. If this was the current chat, clear currentChatId from state
    const state = await getCurrentState(tenantId);

    if (state.currentChatId === chatId) {
      console.log(`= Clearing current chat from state (was ${chatId})`);
      await updateState(tenantId, {
        currentChatId: null
      });
    }

    // 4. Decrement total chats count
    await updateState(tenantId, {
      totalChats: Math.max(0, state.totalChats - 1)
    });

    return true;
  } catch (error) {
    console.error('L Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}
