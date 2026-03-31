import { db } from '../../../../config/firestore';
import { listMessages, Message } from '../services/chats';

export interface FetchChatHistoryParams {
  tenantId: string;
  templateId: string;
  cycleId: string;
  limit?: number; // Optional limit on number of messages (default: 100)
}

/**
 * Tool to fetch chat history for the current cycle
 *
 * This tool:
 * 1. Reads the /agentCycles/main document to get currentChatId
 * 2. Calls listMessages to get all messages in chronological order
 *
 * This abstraction means services only need cycleId to access chat history
 */
export async function fetchChatHistory(
  params: FetchChatHistoryParams
): Promise<Message[]> {
  const { tenantId, templateId, cycleId, limit = 100 } = params;

  console.log('[fetchChatHistory] Fetching chat history for cycle:', cycleId);

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
      console.log('[fetchChatHistory] Main cycle document not found - no chat history available');
      return [];
    }

    const mainData = mainDoc.data();
    const chatId = mainData?.currentChatId;

    if (!chatId) {
      console.log('[fetchChatHistory] No currentChatId found - no chat history available');
      return [];
    }

    console.log('[fetchChatHistory] Resolved chatId:', chatId);

    // Step 2: Fetch messages using the chats service
    const messages = await listMessages(tenantId, templateId, chatId, limit);

    console.log('[fetchChatHistory]  Retrieved', messages.length, 'messages from chat history');

    return messages;
  } catch (error) {
    console.error('[fetchChatHistory] Error fetching chat history:', error);
    // Don't throw - return empty array to allow agent to continue without history
    return [];
  }
}
