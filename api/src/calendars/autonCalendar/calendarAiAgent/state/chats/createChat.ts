/**
 * Create Chat Service
 * Creates a new chat session and automatically sets it as the current chat
 */

import { firestore } from '../../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { updateState, getCurrentState } from '../utils/getCurrentState';

export interface Chat {
  chatId: string;
  tenantId: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  isActive: boolean;
  metadata?: {
    eventCount?: number;
    taskCount?: number;
    totalMessages?: number;
  };
}

export interface CreateChatInput {
  name?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new chat session
 * Automatically sets it as the current chat
 *
 * @param tenantId - The tenant ID
 * @param input - Chat creation data
 * @returns The created chat
 */
export async function createChat(
  tenantId: string,
  input?: CreateChatInput
): Promise<Chat> {
  try {
    const chatId = uuidv4();
    const now = new Date();

    console.log(`=¬ Creating new chat: ${chatId}`);

    const chat: Chat = {
      chatId,
      tenantId,
      name: input?.name,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      metadata: {
        eventCount: 0,
        taskCount: 0,
        totalMessages: 0,
        ...input?.metadata
      }
    };

    const chatRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(chatId);

    await chatRef.set(chat);

    console.log(` Chat created: ${chatId}`);

    // Get current state to increment total chats
    const currentState = await getCurrentState(tenantId);

    // Automatically set as current chat and update stats
    await updateState(tenantId, {
      currentChatId: chatId,
      totalChats: currentState.totalChats + 1
    });

    console.log(` Chat ${chatId} set as current chat`);

    return chat;
  } catch (error) {
    console.error('L Error creating chat:', error);
    throw new Error('Failed to create chat');
  }
}
