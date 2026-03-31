import { db } from '../../../../../../config/firestore';

/**
 * Delete a chat and all its messages
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param chatId - Chat ID
 * @returns void
 */
export async function deleteChat(
  tenantId: string,
  templateId: string,
  chatId: string
): Promise<void> {
  try {
    console.log(`[Delete Chat] Deleting chat ${chatId}`);

    const chatRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId);

    // Delete all messages in the chat first
    const messagesSnapshot = await chatRef.collection('messages').get();

    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the chat document itself
    batch.delete(chatRef);

    await batch.commit();

    console.log(`[Delete Chat]  Chat deleted: ${chatId} (with ${messagesSnapshot.size} messages)`);
  } catch (error) {
    console.error('[Delete Chat] Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}
