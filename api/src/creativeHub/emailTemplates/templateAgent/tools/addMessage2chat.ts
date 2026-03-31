import { db } from '../../../../config/firestore';
import { createMessage, Message } from '../services/chats';

export interface AddMessageToChatParams {
  tenantId: string;
  templateId: string;
  cycleId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Tool to add a message to the current chat associated with a cycle
 *
 * This tool:
 * 1. Reads the /agentCycles/main document to get currentChatId
 * 2. Calls createMessage with the resolved chatId
 *
 * This abstraction means services only need cycleId, not chatId
 */
export async function addMessage2chat(
  params: AddMessageToChatParams
): Promise<Message> {
  const { tenantId, templateId, cycleId, role, content, metadata } = params;

  console.log('[addMessage2chat] Adding message to chat for cycle:', cycleId);

  try {
    // Step 1: Read the main document to get currentChatId
    const mainRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('emailTemplates')
      .doc(templateId)
      .collection('agentCycles')
      .doc('main');

    const mainDoc = await mainRef.get();

    if (!mainDoc.exists) {
      throw new Error('Main cycle document not found - cannot resolve chatId');
    }

    const mainData = mainDoc.data();
    const chatId = mainData?.currentChatId;

    if (!chatId) {
      throw new Error('No currentChatId found in main document - cannot add message to chat');
    }

    console.log('[addMessage2chat] Resolved chatId:', chatId);

    // Step 2: Create the message using the chats service
    const message = await createMessage({
      tenantId,
      templateId,
      chatId,
      role,
      content,
      metadata: {
        ...metadata,
        cycleId // Always include cycleId in metadata
      }
    });

    console.log('[addMessage2chat]  Message added to chat:', message.id);

    return message;
  } catch (error) {
    console.error('[addMessage2chat] Error adding message to chat:', error);
    throw error;
  }
}
