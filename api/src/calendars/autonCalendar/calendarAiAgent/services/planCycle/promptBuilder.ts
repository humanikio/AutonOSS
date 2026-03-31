/**
 * Prompt Builder
 * Compiles all prompt components into final prompt for brain LLM
 */

import { getCycle } from '../../state/cycles/getCycle';
import { SYSTEM_PROMPT } from './promptBuilder/systemPrompt';
import { CALENDAR_CONTEXT_INSTRUCTIONS } from './promptBuilder/calendarContext';
import { STAGE_1_OUTPUT_FORMAT } from './promptBuilder/stage1OutputFormat';
import { loadChatContext } from './promptBuilder/chatContext';
import { getRealWorldStateContext } from '../shared/realWorldStateContext';

export interface PromptBuilderInput {
  tenantId: string;
  cycleId: string;
  chatId: string;
}

/**
 * Build the complete prompt for the brain LLM Stage 1
 * Compiles: system prompt + real-world state + calendar context instructions +
 *           stage 1 output format + chat history + current request
 *
 * @param input - Prompt builder input
 * @returns Compiled prompt string for Stage 1
 */
export async function buildPrompt(input: PromptBuilderInput): Promise<string> {
  try {
    console.log(`=( Building prompt for cycle ${input.cycleId}`);

    // Get current prompt from cycle
    const cycle = await getCycle(input.tenantId, input.cycleId);

    if (!cycle) {
      throw new Error(`Cycle not found: ${input.cycleId}`);
    }

    const currentPrompt = cycle.currentPrompt;

    if (!currentPrompt) {
      throw new Error('No current prompt in cycle');
    }

    console.log(`=� Current prompt: "${currentPrompt.substring(0, 50)}..."`);

    // Load chat history
    const chatContext = await loadChatContext(input.tenantId, input.chatId);

    // Get current date/time context
    const realWorldContext = getRealWorldStateContext();

    // Compile final prompt for Stage 1
    const compiledPrompt = `
${SYSTEM_PROMPT}

---

${realWorldContext}

---

${CALENDAR_CONTEXT_INSTRUCTIONS}

---

${STAGE_1_OUTPUT_FORMAT}

---

Conversation History:
${chatContext}

---

Current User Request:
${currentPrompt}

---

Instructions:
This is STAGE 1. Analyze the current user request in the context of the conversation history. Determine:
1. What calendar context (if any) you need to fulfill this request
2. What response type this is (chat, tools, or hybrid)
3. A brief high-level message to acknowledge the user (1-2 sentences)

Respond ONLY with the JSON structure specified in STAGE 1 OUTPUT FORMAT above.
`.trim();

    console.log(` Prompt compiled (${compiledPrompt.length} characters)`);

    return compiledPrompt;
  } catch (error) {
    console.error('L Error building prompt:', error);
    throw new Error('Failed to build prompt');
  }
}
