/**
 * Request Orchestrator
 * Main orchestration layer for processing user messages
 * Handles: User message → Cycle creation → Planning → Todo execution
 */

import { createMessage, getCurrentChat, createChat, getChatMessages } from '../state/chats';
import { createCycle } from '../state/cycles';
import { planCycle } from '../services/planCycle';
import { completeCycle, failCycle } from '../state/cycles/updateCycle';
import { processToDoQueue } from '../services/processToDoQueue';

export interface ProcessMessageInput {
  tenantId: string;
  prompt: string;
  chatId?: string;              // Optional - will use/create current chat if not provided
  calendarId?: string;          // Optional - for scoped operations
}

export interface ProcessMessageResult {
  success: boolean;
  message: string;
  chatId: string;
  cycleId: string | null;
  error?: string;
}

/**
 * Main request orchestrator
 * Processes user messages with full state management
 *
 * Flow:
 * 1. Ensure chat exists (check message count, create new if >= 20)
 * 2. Save user message
 * 3. Create new cycle with currentPrompt
 * 4. Execute planning cycle (brain LLM + todo creation)
 * 5. Return result
 */
export async function requestOrchestrator(
  input: ProcessMessageInput
): Promise<ProcessMessageResult> {
  const { tenantId, prompt, chatId: providedChatId, calendarId } = input;
  let chatId = providedChatId;

  try {
    console.log(`\n====== REQUEST ORCHESTRATOR STARTED ======`);
    console.log(`Tenant: ${tenantId}`);
    console.log(`Prompt: ${prompt.substring(0, 50)}...`);

    // ============================================
    // STEP 1: Ensure chat exists & check message count
    // ============================================

    if (!chatId) {
      // Check if there's a current chat
      const currentChat = await getCurrentChat(tenantId);

      if (currentChat) {
        chatId = currentChat.chatId;
        console.log(`Using current chat: ${chatId}`);

        // Check message count - create new chat if >= 20 messages
        const messages = await getChatMessages(tenantId, chatId);
        if (messages.length >= 20) {
          console.log(`Chat has ${messages.length} messages - creating new chat`);
          const newChat = await createChat(tenantId, {
            name: `Chat ${new Date().toLocaleDateString()}`
          });
          chatId = newChat.chatId;
          console.log(`Created new chat: ${chatId}`);
        }
      } else {
        // No current chat, create a new one
        const newChat = await createChat(tenantId, {
          name: `Chat ${new Date().toLocaleDateString()}`
        });
        chatId = newChat.chatId;
        console.log(`Created new chat: ${chatId}`);
      }
    }

    // ============================================
    // STEP 2: Save user message
    // ============================================
    console.log(`\nSaving user message...`);

    await createMessage(tenantId, {
      role: 'user',
      content: prompt,
      calendarId,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });

    console.log(`User message saved`);

    // ============================================
    // STEP 3: Create cycle with currentPrompt
    // ============================================
    console.log(`\nCreating execution cycle...`);

    const cycle = await createCycle(tenantId, {
      chatId,
      calendarId,
      currentPrompt: prompt,
      metadata: {
        promptPreview: prompt.substring(0, 100)
      }
    });

    console.log(`Cycle created: ${cycle.cycleId}`);

    // ============================================
    // STEP 4: Execute planning cycle
    // ============================================
    console.log(`\nExecuting planning cycle...`);

    const planResult = await planCycle({
      tenantId,
      cycleId: cycle.cycleId,
      chatId,
      calendarId
    });

    // Check if planning succeeded
    if (!planResult.success) {
      console.log(`Planning failed: ${planResult.error}`);

      // Mark cycle as failed
      await failCycle(tenantId, cycle.cycleId, planResult.error);

      return {
        success: false,
        message: planResult.message,
        chatId,
        cycleId: cycle.cycleId,
        error: planResult.error
      };
    }

    console.log(`Planning completed - ${planResult.todoCount} todo(s) created`);

    // ============================================
    // STEP 5: Process todo queue (if todos exist)
    // ============================================
    if (planResult.todoCount > 0) {
      console.log(`\nProcessing ${planResult.todoCount} todo(s)...`);

      await processToDoQueue({
        tenantId,
        cycleId: cycle.cycleId,
        chatId,
        calendarId
      });

      console.log(`\n✅ Todo queue processing complete`);
    } else {
      console.log(`\nNo todos to process - conversation only`);
    }

    // ============================================
    // STEP 6: Mark cycle as completed
    // ============================================
    console.log(`\nMarking cycle as completed...`);
    await completeCycle(tenantId, cycle.cycleId);

    console.log(`\n====== REQUEST ORCHESTRATOR COMPLETED ======\n`);

    // ============================================
    // STEP 7: Return result
    // ============================================
    return {
      success: true,
      message: planResult.message,
      chatId,
      cycleId: cycle.cycleId
    };
  } catch (error: any) {
    console.error('Request orchestrator error:', error);

    // Try to save error message
    try {
      if (chatId) {
        await createMessage(tenantId, {
          role: 'assistant',
          content: `Sorry, I encountered an unexpected error: ${error.message}`,
          metadata: {
            error: true,
            errorMessage: error.message
          }
        });
      }
    } catch (saveError) {
      console.error('Failed to save error message:', saveError);
    }

    return {
      success: false,
      message: `Orchestrator error: ${error.message}`,
      chatId: chatId || 'unknown',
      cycleId: null,
      error: error.message
    };
  }
}
