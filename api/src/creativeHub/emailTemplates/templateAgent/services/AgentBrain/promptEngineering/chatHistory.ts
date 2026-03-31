import { fetchChatHistory } from '../../../tools/fetchChatHistory';
import { Message } from '../../../services/chats';

export interface FormatChatHistoryParams {
  tenantId: string;
  templateId: string;
  cycleId: string;
}

/**
 * Format chat history for inclusion in the LLM prompt
 *
 * This provides the agent with context about the conversation so far,
 * allowing it to understand previous requests and maintain continuity.
 *
 * @param params - Object containing tenant, template, and cycle IDs
 * @returns Formatted chat history string for the prompt
 */
export async function formatChatHistory(
  params: FormatChatHistoryParams
): Promise<string> {
  const { tenantId, templateId, cycleId } = params;

  console.log('[Format Chat History] Building chat history for prompt...');

  // Fetch chat history using the tool
  const messages = await fetchChatHistory({
    tenantId,
    templateId,
    cycleId,
    limit: 50 // Limit to last 50 messages to avoid token overflow
  });

  // If no chat history, return empty section
  if (messages.length === 0) {
    console.log('[Format Chat History] No chat history available - starting fresh conversation');
    return `==================
CHAT HISTORY:
==================

This is the start of a new conversation. No previous messages.`;
  }

  // Format messages for the prompt
  const formattedMessages = messages
    .map((msg: Message) => {
      const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      const timestamp = msg.createdAt.toISOString();
      return `[${timestamp}] ${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');

  console.log('[Format Chat History]  Formatted', messages.length, 'messages for prompt');

  return `==================
CHAT HISTORY:
==================

Below is the conversation history with the user. Use this context to understand:
- What the user has requested so far
- What you've already done or generated
- Any clarifications or refinements the user has made

IMPORTANT: The user's CURRENT request comes after this history section. Focus on their current request while keeping this context in mind.

${formattedMessages}`;
}
