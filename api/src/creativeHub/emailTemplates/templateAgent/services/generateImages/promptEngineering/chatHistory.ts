import { fetchChatHistory } from '../../../tools/fetchChatHistory';
import { Message } from '../../../services/chats';

export interface FormatChatHistoryForImagesParams {
  tenantId: string;
  templateId: string;
  cycleId: string;
}

/**
 * Format chat history specifically for image generation context
 *
 * This provides context about:
 * - The overall email template request
 * - User's industry, audience, and brand preferences
 * - Any specific design decisions or clarifications made
 * - Style preferences and requirements discussed
 *
 * @param params - Object containing tenant, template, and cycle IDs
 * @returns Formatted chat history for image generation prompt
 */
export async function formatChatHistoryForImages(
  params: FormatChatHistoryForImagesParams
): Promise<string> {
  const { tenantId, templateId, cycleId } = params;

  console.log('[Format Chat History - Images] Building context for image generation...');

  // Fetch chat history using the tool
  const messages = await fetchChatHistory({
    tenantId,
    templateId,
    cycleId,
    limit: 30 // Limit to avoid token overflow
  });

  // If no chat history, return minimal context
  if (messages.length === 0) {
    console.log('[Format Chat History - Images] No history - generating from scratch');
    return `==================
CONVERSATION CONTEXT:
==================

This is a new email template creation request with no prior context.`;
  }

  // Format messages focusing on design-relevant information
  const formattedMessages = messages
    .map((msg: Message) => {
      const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      return `${roleLabel}: ${msg.content}`;
    })
    .join('\n\n');

  console.log('[Format Chat History - Images]  Formatted', messages.length, 'messages for image context');

  return `==================
CONVERSATION CONTEXT:
==================

Below is the conversation history for this email template project.
Use this context to understand:
- The user's industry, target audience, and brand identity
- Overall email purpose and messaging
- Style preferences, color schemes, and aesthetic goals
- Any specific requirements or constraints mentioned
- Design decisions already made

IMPORTANT: Generate images that align with the template's overall vision and requirements discussed in this conversation.

${formattedMessages}

==================
END CONVERSATION CONTEXT
==================`;
}
