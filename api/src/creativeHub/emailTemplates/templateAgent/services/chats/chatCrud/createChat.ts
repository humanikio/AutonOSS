import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../../../../config/firestore';
import { FieldValue } from 'firebase-admin/firestore';

export interface Chat {
  id: string;
  tenantId: string;
  templateId: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  lastMessageAt?: Date;
  messageCount?: number;
}

export interface CreateChatInput {
  tenantId: string;
  templateId: string;
  name?: string;
  createdBy?: string;
}

/**
 * Create a new chat for a template
 *
 * @param input - Chat creation parameters
 * @returns Created chat
 */
export async function createChat(input: CreateChatInput): Promise<Chat> {
  const { tenantId, templateId, name, createdBy } = input;

  try {
    console.log(`[Create Chat] Creating chat for template ${templateId}`);

    // Generate unique chat ID
    const chatId = uuidv4();

    // Create chat document reference
    const chatRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('chats')
      .doc(chatId);

    // Chat data
    const chatData = {
      id: chatId,
      tenantId,
      templateId,
      name: name || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      messageCount: 0,
      ...(createdBy && { createdBy })
    };

    // Write chat to Firestore
    await chatRef.set(chatData);

    console.log(`[Create Chat]  Chat created: ${chatId}`);

    // Return chat with current timestamp
    return {
      ...chatData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Chat;
  } catch (error) {
    console.error('[Create Chat] Error creating chat:', error);
    throw new Error(`Failed to create chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
