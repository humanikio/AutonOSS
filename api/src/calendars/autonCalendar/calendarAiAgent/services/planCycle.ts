/**
 * Plan Cycle Service
 * Main orchestrator for the planning phase
 * Compiles prompt � Calls brain � Posts message � Creates todos
 */

import { buildPrompt } from './planCycle/promptBuilder';
import { callBrainLLM, validateBrainResponse } from './planCycle/brain';
import { analyzeBrainResponse } from './planCycle/analyzeBrainResponse';
import { createMessage } from '../state/chats/createMessage';

export interface PlanCycleInput {
  tenantId: string;
  cycleId: string;
  chatId: string;
  calendarId?: string;
}

export interface PlanCycleResult {
  success: boolean;
  message: string;
  todoCount: number;
  error?: string;
}

/**
 * Execute the planning cycle
 * This is the main orchestrator for determining what the agent should do
 *
 * Flow:
 * 1. Build prompt (compile all context)
 * 2. Call brain LLM (get action plan)
 * 3. Post message to chat FIRST (explain actions to user)
 * 4. Analyze response and create todos
 *
 * @param input - Plan cycle input
 * @returns Plan cycle result with message and todo count
 */
export async function planCycle(input: PlanCycleInput): Promise<PlanCycleResult> {
  try {
    const { tenantId, cycleId, chatId, calendarId } = input;

    console.log(`<� Starting planning cycle ${cycleId}`);

    // Step 1: Build prompt
    console.log(`\n=� Step 1: Building prompt...`);
    const compiledPrompt = await buildPrompt({
      tenantId,
      cycleId,
      chatId
    });

    // Step 2: Call brain LLM (with multi-stage context gathering)
    console.log(`\n>🧠 Step 2: Calling brain LLM...`);
    const brainResponse = await callBrainLLM(compiledPrompt, tenantId, chatId, calendarId);

    // Validate response
    validateBrainResponse(brainResponse);

    // Step 3: Post message to chat FIRST (before creating todos)
    console.log(`\n=� Step 3: Posting message to chat...`);
    console.log(`  Message: "${brainResponse.message.substring(0, 100)}..."`);

    await createMessage(tenantId, {
      role: 'assistant',
      content: brainResponse.message,
      cycleId,
      calendarId,
      metadata: {
        reasoning: brainResponse.reasoning,
        toolCount: brainResponse.tools.length
      }
    });

    console.log(` Message posted to chat`);

    // Step 4: Analyze response and create todos
    console.log(`\n=� Step 4: Creating todo queue...`);
    const todoCount = await analyzeBrainResponse({
      tenantId,
      cycleId,
      brainResponse
    });

    console.log(`\n Planning cycle complete!`);
    console.log(`  Message: "${brainResponse.message}"`);
    console.log(`  Todos created: ${todoCount}`);

    return {
      success: true,
      message: brainResponse.message,
      todoCount
    };
  } catch (error: any) {
    console.error(`\nL Planning cycle failed:`, error);

    // Post error message to chat
    try {
      await createMessage(input.tenantId, {
        role: 'assistant',
        content: `I encountered an error while processing your request: ${error.message}. Please try again.`,
        cycleId: input.cycleId,
        metadata: {
          error: true,
          errorMessage: error.message
        }
      });
    } catch (messageError) {
      console.error('Failed to post error message to chat:', messageError);
    }

    return {
      success: false,
      message: error.message,
      todoCount: 0,
      error: error.message
    };
  }
}
