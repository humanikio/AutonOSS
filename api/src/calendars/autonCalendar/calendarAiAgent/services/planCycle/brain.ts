/**
 * Brain LLM Service - Multi-Stage Coordinator
 * Orchestrates multi-stage brain process with calendar context gathering
 *
 * Stage 1: Review request and determine context needs
 * Stage 2: Pull specific calendar context if needed
 * Stage 3: Make final decision with context
 */

import { reviewPrompt } from './brain/reviewPrompt';
import { pullContext } from './brain/pullContext';
import { finalDecision } from './brain/finalDecision/index';

export interface BrainResponse {
  message: string;
  reasoning: string;
  tools: Array<{
    toolName: 'eventTool' | 'taskTool';
    intent: string;
    context: {
      userRequest: string;
      parameters: Record<string, any>;
    };
  }>;
}

/**
 * Extract conversation history and user request from compiled prompt
 * The prompt has sections marked with "Conversation History:" and "Current User Request:"
 */
function extractContextFromPrompt(compiledPrompt: string): {
  conversationHistory: string;
  userRequest: string;
} {
  // Extract conversation history
  const historyStart = compiledPrompt.indexOf('Conversation History:');
  const historyEnd = compiledPrompt.indexOf('---', historyStart + 1);
  const conversationHistory = historyStart !== -1 && historyEnd !== -1
    ? compiledPrompt.substring(historyStart + 'Conversation History:'.length, historyEnd).trim()
    : '';

  // Extract user request
  const requestStart = compiledPrompt.indexOf('Current User Request:');
  const requestEnd = compiledPrompt.indexOf('---', requestStart + 1);
  const userRequest = requestStart !== -1 && requestEnd !== -1
    ? compiledPrompt.substring(requestStart + 'Current User Request:'.length, requestEnd).trim()
    : '';

  return { conversationHistory, userRequest };
}

/**
 * Multi-stage brain process
 * Analyzes request, gathers calendar context if needed, then makes final decision
 *
 * @param compiledPrompt - The complete prompt from promptBuilder
 * @param tenantId - Tenant ID for context fetching
 * @param chatId - Chat ID for posting tool messages
 * @param calendarId - Calendar ID for context fetching (optional)
 * @returns Structured brain response with message and tools
 */
export async function callBrainLLM(
  compiledPrompt: string,
  tenantId: string,
  chatId: string,
  calendarId?: string
): Promise<BrainResponse> {
  try {
    console.log(`🧠 Starting Multi-Stage Brain Process`);

    // STAGE 1: Review and analyze request
    const reviewOutput = await reviewPrompt(compiledPrompt);

    // If just chat (no tools likely), return early without context
    if (reviewOutput.responseType === 'chat' && reviewOutput.toolsLikely.length === 0) {
      console.log(`💬 Simple chat response - skipping context and tools`);
      return {
        message: reviewOutput.message,
        reasoning: reviewOutput.reasoning,
        tools: []
      };
    }

    // STAGE 2: Pull calendar context if needed
    const calendarContext = await pullContext(tenantId, chatId, calendarId, reviewOutput);

    // Extract conversation history and user request from compiled prompt
    const { conversationHistory, userRequest } = extractContextFromPrompt(compiledPrompt);

    // STAGE 3: Make final decision with context
    const finalResponse = await finalDecision(
      userRequest,
      conversationHistory,
      calendarContext,
      reviewOutput
    );

    console.log(`✅ Multi-Stage Brain Process Complete`);

    return finalResponse;

  } catch (error: any) {
    console.error('❌ Error in multi-stage brain:', error);
    throw new Error(`Brain process failed: ${error.message}`);
  }
}

/**
 * Validate brain response structure
 * Ensures all required fields are present and properly formatted
 *
 * @param response - Brain response to validate
 * @returns true if valid, throws error if invalid
 */
export function validateBrainResponse(response: BrainResponse): boolean {
  // Check message
  if (typeof response.message !== 'string' || response.message.trim() === '') {
    throw new Error('Invalid brain response: message must be a non-empty string');
  }

  // Check tools array
  if (!Array.isArray(response.tools)) {
    throw new Error('Invalid brain response: tools must be an array');
  }

  // Validate each tool
  response.tools.forEach((tool, idx) => {
    if (!tool.toolName || !['eventTool', 'taskTool'].includes(tool.toolName)) {
      throw new Error(`Invalid tool at index ${idx}: toolName must be "eventTool" or "taskTool"`);
    }

    if (typeof tool.intent !== 'string' || tool.intent.trim() === '') {
      throw new Error(`Invalid tool at index ${idx}: intent must be a non-empty string`);
    }

    if (!tool.context || typeof tool.context !== 'object') {
      throw new Error(`Invalid tool at index ${idx}: context must be an object`);
    }

    if (typeof tool.context.userRequest !== 'string') {
      throw new Error(`Invalid tool at index ${idx}: context.userRequest must be a string`);
    }

    if (!tool.context.parameters || typeof tool.context.parameters !== 'object') {
      throw new Error(`Invalid tool at index ${idx}: context.parameters must be an object`);
    }
  });

  return true;
}
