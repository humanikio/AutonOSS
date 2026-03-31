import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>; // For storing tools, images, etc.
}

export interface CreateMessageInput {
  tenantId: string;
  templateId: string;
  chatId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new message in a chat
 * Also updates the chat's lastMessageAt and messageCount
 *
 * @param input - Message creation parameters
 * @returns Created message
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const { tenantId, templateId, chatId, role, content, metadata } = input;

  try {
    console.log(`[Create Message] Adding ${role} message to chat ${chatId}`);

    // Generate unique message ID
    const messageId = uuidv4();

    // Create message document reference
    const messageRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    // Message data
    const messageData = {
      id: messageId,
      chatId,
      role,
      content,
      createdAt: FieldValue.serverTimestamp(),
      ...(metadata && { metadata })
    };

    // Write message to Firestore
    await messageRef.set(messageData);

    // Update chat document with last message time and increment count
    const chatRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId);

    await chatRef.update({
      lastMessageAt: FieldValue.serverTimestamp(),
      messageCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`[Create Message]  Message created: ${messageId}`);

    // Return message with current timestamp
    return {
      ...messageData,
      createdAt: new Date()
    } as Message;
  } catch (error) {
    console.error('[Create Message] Error creating message:', error);
    throw new Error(`Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
