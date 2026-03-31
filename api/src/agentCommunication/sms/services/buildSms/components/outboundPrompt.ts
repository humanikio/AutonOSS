import { ActionData } from '../../actionPromptService';

/**
 * Outbound SMS prompt context for agent-initiated messages
 * This context explains to the agent that they are starting a conversation
 * or continuing one with a specific purpose/action in mind
 */
export class OutboundPrompt {
  static getOutboundContext(
    actionData?: ActionData | null, 
    conversationFlow?: 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting'
  ): string {
    let outboundContext = `OUTBOUND MESSAGE CONTEXT - AGENT INITIATED:

<� YOU are starting this interaction based on a specific action or trigger
=� This is NOT a reply to a customer message - you are reaching out proactively
=� Your goal is to initiate meaningful conversation that feels natural and helpful

OUTBOUND APPROACH:
- Start the conversation naturally without referencing "triggers" or "actions"
- Be helpful and relevant to what the customer might need
- Use conversation history to make your outreach feel continuous and personal
- Don't mention that this is an "outbound message" or "automated trigger"
- Sound like a real person naturally reaching out with useful information`;

    // Handle different conversation flow states for outbound messages
    const flowContext = this.getOutboundFlowContext(conversationFlow);
    outboundContext += `\n\n${flowContext}`;

    if (actionData) {
      outboundContext += `

ACTION-DRIVEN PURPOSE:
The specific reason for this outreach is: ${actionData.name} (${actionData.description})

${actionData.prompt}

CRITICAL: Use this action context to guide your message purpose and direction, but don't mention the action name directly. Make it sound natural and customer-focused.`;
    }

    outboundContext += `

NATURALNESS REQUIREMENTS:
- Sound like a helpful human, not a bot or system
- Be concise and SMS-appropriate (1-2 messages max)
- Provide clear value or next steps
- Invite natural conversation flow
- Use conversation history to personalize appropriately`;

    return outboundContext;
  }

  /**
   * Get sophisticated conversation flow context for outbound messages
   */
  private static getOutboundFlowContext(
    conversationFlow?: 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting'
  ): string {
    switch (conversationFlow) {
      case 'first_contact':
        return `FIRST OUTBOUND CONTACT:
- This is your first proactive outreach to this customer
- Introduce yourself naturally if appropriate
- Provide immediate value or relevance in your opening message
- Set a helpful, professional tone for future interactions
- Be welcoming but not overly familiar`;

      case 'immediate_continuation':
        return `OUTBOUND CONTINUATION (Flowing):
- Continue naturally from your previous conversation with this customer
- NO greetings - you're already talking!
- Reference relevant details from your conversation history naturally
- Make this feel like a natural follow-up in the same conversation
- Don't restart or re-introduce yourself`;

      case 'brief_pause':
        return `OUTBOUND AFTER BRIEF PAUSE:
- Continue from previous conversation but acknowledge slight gap if natural
- Reference what you were discussing before
- Skip formal greetings but can be casually familiar
- Make it feel like natural follow-up conversation`;

      case 'extended_pause':
        return `OUTBOUND AFTER EXTENDED PAUSE:
- Lightly acknowledge the gap in a natural way
- Reference previous conversation context
- Show you remember and are following up thoughtfully
- Bridge naturally: "wanted to follow up on..." or "checking back about..."`;

      case 'long_gap':
        return `OUTBOUND AFTER LONG GAP:
- Acknowledge the time that's passed naturally
- Show clear memory of previous conversation
- "hey! following up from our chat about..." or "been thinking about what you mentioned"
- Re-establish context warmly`;

      case 'reconnecting':
        return `OUTBOUND RECONNECTION:
- Acknowledge significant time gap warmly
- Show you remember them and previous conversation clearly
- "hey there! been a while, but wanted to reach out about..."
- Bridge back to previous context naturally`;

      default:
        return `OUTBOUND CONTEXT:
- Reach out naturally based on conversation history
- Be helpful and provide clear value
- Reference previous interaction if available`;
    }
  }
}