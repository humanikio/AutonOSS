/**
 * Create Message Service
 * Adds a message to the current chat session
 */

import { firestore } from '../../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentState, updateState } from '../utils/getCurrentState';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  messageId: string;
  chatId: string;
  tenantId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;

  // Optional context
  calendarId?: string;
  eventId?: string;
  taskId?: string;

  // Agent execution metadata
  cycleId?: string;
  toolCalls?: {
    tool: string;
    params: Record<string, any>;
    result?: any;
  }[];

  metadata?: Record<string, any>;
}

export interface CreateMessageInput {
  role: MessageRole;
  content: string;
  calendarId?: string;
  eventId?: string;
  taskId?: string;
  cycleId?: string;
  toolCalls?: {
    tool: string;
    params: Record<string, any>;
    result?: any;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Create a message in the current chat
 * Uses getCurrentState to determine which chat to add the message to
 *
 * @param tenantId - The tenant ID
 * @param input - Message data
 * @returns The created message
 */
export async function createMessage(
  tenantId: string,
  input: CreateMessageInput
): Promise<Message> {
  try {
    // Get current state to find active chat
    const state = await getCurrentState(tenantId);

    if (!state.currentChatId) {
      throw new Error('No current chat set. Create a chat first.');
    }

    const messageId = uuidv4();
    const now = new Date();

    console.log(`=Ý Creating message in chat ${state.currentChatId}`);

    const message: Message = {
      messageId,
      chatId: state.currentChatId,
      tenantId,
      role: input.role,
      content: input.content,
      createdAt: now,
      calendarId: input.calendarId,
      eventId: input.eventId,
      taskId: input.taskId,
      cycleId: input.cycleId,
      toolCalls: input.toolCalls,
      metadata: input.metadata
    };

    const messageRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(state.currentChatId)
      .collection('messages')
      .doc(messageId);

    await messageRef.set(message);

    console.log(` Message created: ${messageId}`);

    // Update chat metadata
    const chatRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('chats')
      .doc(state.currentChatId);

    const chatDoc = await chatRef.get();
    const chatData = chatDoc.data();
    const currentMessageCount = chatData?.metadata?.totalMessages || 0;

    await chatRef.update({
      lastMessageAt: now,
      updatedAt: now,
      'metadata.totalMessages': currentMessageCount + 1
    });

    // Update global message count
    await updateState(tenantId, {
      totalMessages: state.totalMessages + 1
    });

    return message;
  } catch (error) {
    console.error('L Error creating message:', error);
    throw new Error('Failed to create message');
  }
}
