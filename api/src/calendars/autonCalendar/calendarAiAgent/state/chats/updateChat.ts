/**
 * Update Chat Service
 * Updates chat metadata
 */

import { firestore } from '../../../../../config/firebase';
import { Chat } from './createChat';

export interface UpdateChatInput {
  name?: string;
  metadata?: {
    eventCount?: number;
    taskCount?: number;
    totalMessages?: number;
    [key: string]: any;
  };
}

/**
 * Update a chat's metadata
 *
 * @param tenantId - The tenant ID
 * @param chatId - The chat ID to update
 * @param input - Update data
 * @returns The updated chat or null if not found
 */
export async function updateChat(
  tenantId: string,
  chatId: string,
  input: UpdateChatInput
): Promise<Chat | null> {
  try {
    console.log(`= Updating chat: ${chatId}`);

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
      return null;
    }

    const updateData: any = {
      ...input,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await chatRef.update(updateData);

    console.log(` Chat updated: ${chatId}`);

    // Fetch and return updated chat
    const updatedDoc = await chatRef.get();
    const data = updatedDoc.data() as Chat;

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
  } catch (error) {
    console.error('L Error updating chat:', error);
    throw new Error('Failed to update chat');
  }
}
