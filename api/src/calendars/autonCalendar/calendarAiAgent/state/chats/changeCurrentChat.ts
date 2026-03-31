/**
 * Change Current Chat Service
 * Switches the active chat to a different chat session
 */

import { firestore } from '../../../../../config/firebase';
import { updateState } from '../utils/getCurrentState';

/**
 * Change the current active chat
 * Updates the main state document with the new chatId
 *
 * @param tenantId - The tenant ID
 * @param chatId - The chat ID to switch to
 * @returns True if successful
 */
export async function changeCurrentChat(
  tenantId: string,
  chatId: string
): Promise<boolean> {
  try {
    console.log(`= Changing current chat to: ${chatId}`);

    // Verify the chat exists
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
      throw new Error('Chat not found');
    }

    // Update the current chat in main state
    await updateState(tenantId, {
      currentChatId: chatId
    });

    // Mark the chat as active
    await chatRef.update({
      isActive: true,
      updatedAt: new Date()
    });

    console.log(` Current chat changed to: ${chatId}`);

    return true;
  } catch (error) {
    console.error('L Error changing current chat:', error);
    throw new Error('Failed to change current chat');
  }
}
