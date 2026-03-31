import { db } from '../../../../../../config/firestore';
import { Chat } from './createChat';

/**
 * Read a chat by ID
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param chatId - Chat ID
 * @returns Chat or null if not found
 */
export async function readChat(
  tenantId: string,
  templateId: string,
  chatId: string
): Promise<Chat | null> {
  try {
    const chatDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId)
      .get();

    if (!chatDoc.exists) {
      console.log(`[Read Chat] Chat not found: ${chatId}`);
      return null;
    }

    const data = chatDoc.data();
    if (!data) {
      return null;
    }

    return {
      id: chatDoc.id,
      tenantId: data.tenantId,
      templateId: data.templateId,
      name: data.name,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      lastMessageAt: data.lastMessageAt?.toDate(),
      messageCount: data.messageCount || 0
    };
  } catch (error) {
    console.error('[Read Chat] Error reading chat:', error);
    throw new Error('Failed to read chat');
  }
}
