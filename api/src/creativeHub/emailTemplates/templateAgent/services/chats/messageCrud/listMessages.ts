import { db } from '../../../../../../config/firestore';
import { Message } from './createMessage';

/**
 * List all messages for a chat
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param chatId - Chat ID
 * @param limit - Maximum number of messages to return (default: 100)
 * @returns Array of messages, ordered chronologically (oldest first)
 */
export async function listMessages(
  tenantId: string,
  templateId: string,
  chatId: string,
  limit: number = 100
): Promise<Message[]> {
  try {
    console.log(`[List Messages] Fetching messages for chat ${chatId}`);

    const messagesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    const messages: Message[] = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        chatId: data.chatId,
        role: data.role,
        content: data.content,
        createdAt: data.createdAt?.toDate() || new Date(),
        metadata: data.metadata
      };
    });

    console.log(`[List Messages]  Found ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error('[List Messages] Error listing messages:', error);
    throw new Error('Failed to list messages');
  }
}
