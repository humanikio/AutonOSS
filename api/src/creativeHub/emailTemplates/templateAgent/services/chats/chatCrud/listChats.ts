import { db } from '../../../../../../config/firestore';
import { Chat } from './createChat';

/**
 * List all chats for a template
 *
 * @param tenantId - Tenant ID
 * @param templateId - Template ID
 * @param limit - Maximum number of chats to return (default: 50)
 * @returns Array of chats, ordered by most recent first
 */
export async function listChats(
  tenantId: string,
  templateId: string,
  limit: number = 50
): Promise<Chat[]> {
  try {
    console.log(`[List Chats] Fetching chats for template ${templateId}`);

    const chatsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const chats: Chat[] = chatsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        tenantId: data.tenantId,
        templateId: data.templateId,
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        lastMessageAt: data.lastMessageAt?.toDate(),
        messageCount: data.messageCount || 0
      };
    });

    console.log(`[List Chats]  Found ${chats.length} chats`);
    return chats;
  } catch (error) {
    console.error('[List Chats] Error listing chats:', error);
    throw new Error('Failed to list chats');
  }
}
