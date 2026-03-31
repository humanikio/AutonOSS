/**
 * List Chats Service
 * Retrieves all chat sessions for a tenant
 */

import { firestore } from '../../../../../config/firebase';
import { Chat } from './createChat';

/**
 * Get all chats for a tenant
 * Ordered by most recently updated
 *
 * @param tenantId - The tenant ID
 * @returns Array of chats
 */
export async function listChats(tenantId: string): Promise<Chat[]> {
  try {
    console.log(`=Ë Listing all chats for tenant: ${tenantId}`);

    const chatsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .orderBy('updatedAt', 'desc');

    const snapshot = await chatsRef.get();

    if (snapshot.empty) {
      console.log(`9 No chats found for tenant ${tenantId}`);
      return [];
    }

    const chats: Chat[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Chat;
      return {
        ...data,
        createdAt: data.createdAt instanceof Date
          ? data.createdAt
          : (data.createdAt as any).toDate(),
        updatedAt: data.updatedAt instanceof Date
          ? data.updatedAt
          : (data.updatedAt as any).toDate(),
        lastMessageAt: data.lastMessageAt
          ? (data.lastMessageAt instanceof Date
              ? data.lastMessageAt
              : (data.lastMessageAt as any).toDate())
          : undefined
      };
    });

    console.log(` Found ${chats.length} chats for tenant ${tenantId}`);

    return chats;
  } catch (error) {
    console.error('L Error listing chats:', error);
    throw new Error('Failed to list chats');
  }
}
