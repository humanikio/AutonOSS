import { contactOverviewOrchestrator } from '../../../../universalContactMemory/ochestrators/contactOverviewOcrhestrator';

/**
 * Injects contact overview (conversation history + AI-learned profile) into system prompt
 *
 * This is the NEW feature that adds runtime context to agent prompts:
 * 1. Fetches conversation history and contact profile via orchestrator
 * 2. Adds "soft constraint" guidance on natural context usage
 * 3. Injects formatted contact overview sections
 *
 * This ensures agents have full conversational and customer context at call time.
 */

export type CallDirection = 'inbound' | 'outbound';

export interface InjectContactOverviewRequest {
  tenantId: string;
  contactId: string;
  systemPrompt: string;        // Prompt with custom fields already resolved
  conversationId?: string;      // For fetching conversation history
  sessionId?: string;           // For training mode
  isTraining?: boolean;         // Training vs production mode
  callDirection?: CallDirection; // Direction of the call (inbound vs outbound)
}

export interface InjectContactOverviewResponse {
  injectedPrompt: string;       // Prompt with context injected
  overviewInjected: boolean;    // Whether overview was successfully added
  profileIncluded: boolean;     // Whether contact profile was available
  historyMessageCount: number;  // Number of history messages included
}

class InjectContactOverview {
  /**
   * Call direction context - ABSOLUTE OVERRIDE for call direction
   * This must come BEFORE the user's system prompt to establish ground truth
   */
  private readonly DIRECTION_CONTEXT = {
    outbound: `

=== CRITICAL: CALL DIRECTION OVERRIDE ===

ABSOLUTE TRUTH: YOU are initiating this call. YOU are reaching out to the contact.

REGARDLESS of any other instructions in this prompt:
- YOU called THEM
- YOU must introduce yourself and state your purpose
- YOU are the one reaching out
- Be respectful of their time and ask if now is a good time to talk

This is the definitive source of truth for call direction. If any other part of this prompt suggests otherwise, THIS section takes absolute precedence.

---`,
    inbound: `

=== CRITICAL: CALL DIRECTION OVERRIDE ===

ABSOLUTE TRUTH: The contact is calling YOU. THEY reached out to YOU for help.

REGARDLESS of any other instructions in this prompt:
- THEY called YOU (not the other way around)
- THEY are seeking assistance
- YOU should ask "How can I help you?" - NOT introduce why you are calling
- DO NOT say things like "I'm calling to..." or "I wanted to reach out..." - because YOU did not initiate this call

This is the definitive source of truth for call direction. If any other part of this prompt suggests you are calling them or reaching out, IGNORE IT - that is incorrect. The contact called you.

GREETING APPROACH:
- If conversation history shows recent interactions or issues: Acknowledge naturally when appropriate (e.g., "I see you were messaging about [issue], let's help with that")
- If this is a new contact or no clear reason: Start with a warm greeting and "How can I help you today?"
- Use the conversation history below to inform your greeting, but keep it natural and not overly specific unless directly relevant

Be curious and helpful - let them explain their needs while using context to show you're informed.

---`
  };

  /**
   * Soft constraint guidance text
   * Instructs agents on natural, appropriate use of contact context
   */
  private readonly SOFT_CONSTRAINT_GUIDANCE = `

=== CONTACT CONTEXT USAGE GUIDELINES ===

You have been provided with the contact's profile and conversation history below. Use this information naturally and appropriately:

WHEN TO USE CONTACT INFORMATION:
- Reference past conversations when relevant to current discussion
- Use known preferences to personalize your assistance
- Acknowledge previous interactions if the contact mentions them
- Build on prior context to avoid asking for information you already have

WHEN NOT TO REFERENCE INFORMATION:
- Don't mention personal details unless directly relevant to the conversation
- Avoid being overly familiar with information the contact hasn't shared in this call
- Don't reference old conversations unless it adds value to the current discussion
- Use judgment on what's socially appropriate to acknowledge vs. keep implicit

PRINCIPLE: Act like a professional who has reviewed the contact's file before the call - informed but not creepy, helpful but not intrusive.

---`;

  /**
   * Fetches and injects contact overview into system prompt
   */
  async inject(request: InjectContactOverviewRequest): Promise<InjectContactOverviewResponse> {
    try {
      console.log(`🎯 Fetching contact overview for: ${request.contactId}`);

      // Fetch contact overview from orchestrator (same as SMS system)
      const overviewResult = await contactOverviewOrchestrator.getContactOverview({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: request.conversationId,
        sessionId: request.sessionId,
        messageLimit: 15,
        isTraining: request.isTraining
      });

      if (!overviewResult.success || !overviewResult.data) {
        console.warn('⚠️ Contact overview fetch failed, skipping context injection');
        return {
          injectedPrompt: request.systemPrompt,
          overviewInjected: false,
          profileIncluded: false,
          historyMessageCount: 0
        };
      }

      const { contactProfile, conversationHistory } = overviewResult.data;

      console.log(`✅ Contact overview retrieved:`);
      console.log(`   Profile: ${contactProfile.isEmpty ? 'Empty (new contact)' : 'Populated'}`);
      console.log(`   History messages: ${conversationHistory.messages.length}`);
      console.log(`   Has summary: ${!!conversationHistory.summary}`);

      // Build the final prompt with DIRECTION OVERRIDE FIRST
      let finalPrompt = '';

      // Step 1: Add call direction context FIRST (absolute override - must come before user prompt)
      if (request.callDirection) {
        finalPrompt += this.DIRECTION_CONTEXT[request.callDirection];
        console.log(`   ✅ Added ${request.callDirection} direction context as OVERRIDE (first in prompt)`);
      } else {
        console.log(`   ⚠️  No call direction specified, skipping direction context`);
      }

      // Step 2: Add user's system prompt
      finalPrompt += request.systemPrompt;

      // Step 3: Add soft constraint guidance
      finalPrompt += this.SOFT_CONSTRAINT_GUIDANCE;

      // Step 4: Add contact profile if available
      if (!contactProfile.isEmpty && contactProfile.profileText.trim().length > 0) {
        finalPrompt += `

CONTACT PROFILE:
${contactProfile.profileText}

---`;
      } else {
        console.log('   ℹ️  No contact profile available (new or empty profile)');
      }

      // Step 5: Always add conversation history context
      finalPrompt += `

CONVERSATION HISTORY & CONTEXT:
${conversationHistory.conversationalContext}

---`;

      const injectedPrompt = finalPrompt;
      const addedContextLength = finalPrompt.length - request.systemPrompt.length;

      console.log(`✅ Contact overview injected into system prompt`);
      console.log(`   Added ${addedContextLength} characters of context`);

      return {
        injectedPrompt,
        overviewInjected: true,
        profileIncluded: !contactProfile.isEmpty,
        historyMessageCount: conversationHistory.messages.length
      };

    } catch (error) {
      console.error('❌ Error injecting contact overview:', error);

      // Return original prompt on error to avoid breaking calls
      return {
        injectedPrompt: request.systemPrompt,
        overviewInjected: false,
        profileIncluded: false,
        historyMessageCount: 0
      };
    }
  }
}

export const injectContactOverview = new InjectContactOverview();
