/**
 * Chat Context
 * Loads and formats conversation history
 */

import { getChatMessages } from '../../../state/chats/getChatMessages';

/**
 * Load chat context for the brain
 * Formats last N messages as conversation history
 *
 * @param tenantId - The tenant ID
 * @param chatId - The chat ID
 * @param limit - Number of messages to load (default: 50, increased to capture more context)
 * @returns Formatted chat history string
 */
export async function loadChatContext(
  tenantId: string,
  chatId: string,
  limit: number = 50
): Promise<string> {
  try {
    // Load recent messages - getChatMessages returns in chronological order (asc)
    const messages = await getChatMessages(tenantId, chatId);

    if (!messages || messages.length === 0) {
      return 'No previous conversation history.';
    }

    // Filter out tool messages (status updates) - only include actual conversation
    const conversationMessages = messages.filter(msg =>
      msg.metadata?.toolMessage !== true
    );

    if (conversationMessages.length === 0) {
      return 'No previous conversation history.';
    }

    // Take the last N conversation messages to stay within token limits
    // but include enough context for multi-turn conversations
    const recentMessages = conversationMessages.slice(-limit);

    // Format messages as conversation
    const formattedMessages = recentMessages.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    });

    console.log(`📝 Loaded ${recentMessages.length} conversation messages (from ${conversationMessages.length} total, ${messages.length} including tool messages)`);

    return formattedMessages.join('\n');
  } catch (error) {
    console.error('Error loading chat context:', error);
    return 'Error loading conversation history.';
  }
}
