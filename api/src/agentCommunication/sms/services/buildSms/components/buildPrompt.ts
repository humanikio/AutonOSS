import { BasePrompt } from './basePrompt';
import { ChatHistoryResult } from '../../../utilities/getChatHistory';
import { ActionData } from '../../actionPromptService';
import { OutboundPrompt } from './outboundPrompt';
import { baselineDocumentService } from '../../baselineDocumentService';

/**
 * Prompt builder component that assembles the complete prompt for SMS generation
 * Combines base prompt, analysis results, and user message context
 */

export interface AnalysisData {
  analysis: string;
  ragNeeded: boolean;
  ragAnalysis?: string;
  documentContexts?: Array<{
    documentId: string;
    documentTitle: string;
    relevantContent: string;
  }>;
  kbDocumentIds?: string[];
}

export interface MessageContext {
  userMessage: string;
  from?: string;
  to?: string;
  messageId?: string;
  conversationId?: string;
  conversationHistory?: ChatHistoryResult['conversationHistory'];
  contactProfile?: ChatHistoryResult['contactProfile']; // NEW: AI-learned contact profile
  promptContext?: ChatHistoryResult['promptContext']; // NEW: Pre-formatted prompt sections
}

export interface AgentConfig {
  name: string;
  prompt: string;
  businessContext?: string;
  specialInstructions?: string;
}

export interface BuildPromptRequest {
  analysisData: AnalysisData;
  messageContext: MessageContext;
  agentConfig: AgentConfig;
  tenantId: string; // NEW: Required for baseline document loading
  caseId?: string;
  actionData?: ActionData | null; // NEW: Optional action context
  isOutbound?: boolean; // NEW: Flag for outbound messages
}

export class BuildPrompt {
  /**
   * Assemble the complete prompt for SMS message generation with optional action context
   * Now includes mandatory baseline document integration
   */
  static async assemblePrompt(request: BuildPromptRequest): Promise<string> {
    const { analysisData, messageContext, agentConfig, actionData, isOutbound, tenantId } = request;

    // CRITICAL: Load baseline document FIRST - this is now required for ALL interactions
    console.log('📋 Loading company baseline document...');
    const baselineContext = await baselineDocumentService.getFormattedBaseline(tenantId);
    
    // REVOLUTIONARY HUMAN-LIKE CONVERSATION FLOW DETECTION
    // This determines how naturally the AI responds based on timing and conversation flow
    const hasConversationHistory = messageContext.conversationHistory?.messages && 
      messageContext.conversationHistory.messages.length > 0;
    
    type ConversationFlow = 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting';
    let conversationFlow: ConversationFlow = 'first_contact';
    let timeGapMinutes = 0;
    let flowDescription = '';

    if (hasConversationHistory) {
      const messages = messageContext.conversationHistory!.messages;
      const agentMessages = messages.filter(msg => msg.isFromAgent);
      const totalMessages = messages.length;
      const agentMessageCount = agentMessages.length;
      
      // If no agent messages, this is truly first contact
      if (agentMessageCount === 0) {
        conversationFlow = 'first_contact';
        flowDescription = 'First interaction ever with this customer';
      } else {
        // Calculate time gap since last message
        const lastMessage = messages[messages.length - 1];
        const now = Date.now();
        const lastMessageTime = typeof lastMessage.timestamp?.toMillis === 'function' 
          ? lastMessage.timestamp.toMillis() 
          : Date.now();
        timeGapMinutes = Math.round((now - lastMessageTime) / (1000 * 60));
        
        // HUMAN-LIKE FLOW DETERMINATION based on time gaps
        if (timeGapMinutes <= 5) {
          conversationFlow = 'immediate_continuation';
          flowDescription = `Immediate continuation (${timeGapMinutes}m gap) - flowing conversation`;
        } else if (timeGapMinutes <= 30) {
          conversationFlow = 'brief_pause';  
          flowDescription = `Brief pause (${timeGapMinutes}m gap) - casual re-engagement`;
        } else if (timeGapMinutes <= 120) {
          conversationFlow = 'extended_pause';
          flowDescription = `Extended pause (${timeGapMinutes}m gap) - acknowledge the gap`;
        } else if (timeGapMinutes <= 1440) { // 24 hours
          conversationFlow = 'long_gap';
          flowDescription = `Long gap (${Math.round(timeGapMinutes/60)}h gap) - significant time passed`;
        } else {
          conversationFlow = 'reconnecting';
          flowDescription = `Reconnecting (${Math.round(timeGapMinutes/1440)}d gap) - like meeting again`;
        }
        
        // CRITICAL: Override for very early conversation stages
        // Even with time gaps, if this is still the first few exchanges, treat more naturally
        if (agentMessageCount === 1 && totalMessages <= 3 && timeGapMinutes <= 30) {
          conversationFlow = 'immediate_continuation';
          flowDescription += ' (early conversation override)';
        }
      }
      
      console.log(`📊 Conversation Analysis: ${agentMessageCount} agent messages, ${totalMessages} total messages`);
      console.log(`⏰ Time gap: ${timeGapMinutes} minutes`);
    }

    console.log(`🎯 CONVERSATION FLOW: ${conversationFlow.toUpperCase()}`);
    console.log(`📝 Flow Description: ${flowDescription}`);
    if (hasConversationHistory) {
      console.log(`📊 History: ${messageContext.conversationHistory?.messages?.length || 0} messages`);
      console.log(`📝 Context length: ${messageContext.conversationHistory?.conversationalContext?.length || 0} chars`);
    }

    // Get the configured base prompt with conversation state and action context awareness
    const actionContext = actionData ? {
      name: actionData.name,
      description: actionData.description,
      prompt: actionData.prompt,
      type: actionData.type
    } : undefined;

    const basePrompt = BasePrompt.getConfiguredPrompt(
      agentConfig.name,
      agentConfig.prompt,
      agentConfig.businessContext,
      conversationFlow, // UPDATED: Use sophisticated flow instead of binary state
      actionContext, // NEW: Pass action context to base prompt
      isOutbound // NEW: Pass outbound flag to base prompt
    );

    // Start building prompt with clear separation between history and current message
    let completePrompt = basePrompt;

    // SECTION 1: ALWAYS INCLUDE - Company Baseline Document (HIGHEST PRIORITY)
    completePrompt += `\n\n${baselineContext}`;

    // SECTION 2: NEW - Contact Profile (AI-learned customer information)
    const contactProfileSection = messageContext.promptContext?.contactProfileSection ||
      this.buildDefaultContactProfileSection(messageContext.contactProfile);
    completePrompt += `\n\n${contactProfileSection}`;

    // SECTION 3: Previous Conversation History with HUMAN-LIKE FLOW CONTEXT
    const conversationContext = this.buildHumanLikeConversationContext(
      messageContext.conversationHistory?.conversationalContext || '',
      conversationFlow,
      timeGapMinutes,
      Boolean(hasConversationHistory),
      messageContext.conversationHistory?.messages || []
    );
    completePrompt += `\n\n${conversationContext}`;

    // SECTION 4: Outbound Context (if outbound message)
    if (isOutbound) {
      const outboundContext = OutboundPrompt.getOutboundContext(actionData, conversationFlow);
      completePrompt += `\n\n${outboundContext}`;
    }

    // SECTION 5: Current Message Analysis (what the user just sent) - SKIP FOR OUTBOUND
    if (!isOutbound) {
      const currentMessageSection = this.buildCurrentMessageSection(messageContext, analysisData);
      completePrompt += `\n\n${currentMessageSection}`;
    }

    // SECTION 6: Knowledge Base Context (if RAG was used)
    const knowledgeBaseContext = analysisData.ragNeeded && analysisData.documentContexts
      ? this.buildKnowledgeBaseContext(analysisData.documentContexts)
      : '';

    if (knowledgeBaseContext) {
      completePrompt += `\n\n${knowledgeBaseContext}`;
    }

    // SECTION 7: Human-Like Task Instructions Based on Conversation Flow
    const taskInstructions = this.buildHumanLikeTaskInstructions(conversationFlow, isOutbound, timeGapMinutes);
    completePrompt += `\n\n${taskInstructions}`;

    console.log(`📏 Final prompt assembled: ${completePrompt.length} characters`);
    
    // Log action context usage for debugging
    if (actionData) {
      console.log(`🎯 Action context applied: ${actionData.name} (${actionData.type})`);
      console.log(`📋 Action prompt length: ${actionData.prompt.length} characters`);
    }
    
    return completePrompt;
  }

  /**
   * Build the current message section (combines message content with analysis)
   */
  private static buildCurrentMessageSection(messageContext: MessageContext, analysisData: AnalysisData): string {
    let section = `CURRENT MESSAGE TO RESPOND TO:
Customer just sent: "${messageContext.userMessage}"`;

    // Add message metadata if available
    if (messageContext.from || messageContext.to) {
      section += `\n\nMessage Details:`;
      if (messageContext.from) section += `\n- From: ${messageContext.from}`;
      if (messageContext.to) section += `\n- To: ${messageContext.to}`;
    }

    // Add analysis of what the customer wants/means
    section += `\n\nAnalysis of Customer's Intent:
${analysisData.analysis}`;

    if (analysisData.ragNeeded && analysisData.ragAnalysis) {
      section += `\n\nEnhanced Analysis (with knowledge base context):
${analysisData.ragAnalysis}`;
    }

    return section;
  }

  /**
   * Build the analysis context section (DEPRECATED - now part of buildCurrentMessageSection)
   */
  private static buildAnalysisContext(analysisData: AnalysisData): string {
    let context = `Analysis of Customer Message:
${analysisData.analysis}`;

    if (analysisData.ragNeeded && analysisData.ragAnalysis) {
      context += `\n\nEnhanced Analysis (with knowledge base context):
${analysisData.ragAnalysis}`;
    }

    return context;
  }

  /**
   * Build the message context section (DEPRECATED - now part of buildCurrentMessageSection)
   */
  private static buildMessageContext(messageContext: MessageContext): string {
    let context = `Customer's Message:
"${messageContext.userMessage}"`;

    if (messageContext.from || messageContext.to) {
      context += `\n\nMessage Details:`;
      if (messageContext.from) context += `\n- From: ${messageContext.from}`;
      if (messageContext.to) context += `\n- To: ${messageContext.to}`;
    }

    return context;
  }

  /**
   * Build INCREDIBLY HUMAN-LIKE conversation context based on sophisticated flow detection
   * This is the CORE of making conversations feel completely natural
   */
  private static buildHumanLikeConversationContext(
    conversationalContext: string, 
    conversationFlow: 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting',
    timeGapMinutes: number,
    hasHistory: boolean,
    messages: any[]
  ): string {
    
    const baseHistory = conversationalContext.trim() ? `PREVIOUS CONVERSATION HISTORY:

${conversationalContext}

` : '';

    switch (conversationFlow) {
      case 'first_contact':
        return `CONVERSATION STATUS: FIRST CONTACT 🚀

This is your VERY FIRST interaction with this customer:
- You have NEVER spoken to them before
- NO previous context exists
- Start fresh with appropriate greeting
- Be welcoming but not overly familiar
- Don't reference any past conversations
- Act like you're genuinely meeting them for the first time

TONE: Fresh, welcoming, professional but warm`;

      case 'immediate_continuation':
        return `${baseHistory}CONVERSATION FLOW: IMMEDIATE CONTINUATION ⚡ (${timeGapMinutes}m gap)

This conversation is FLOWING - respond like you just texted back:
- DO NOT greet them again (no "Hi!", "Hey!", "Hello!")
- Continue EXACTLY where the conversation left off
- Reference what you were just discussing naturally
- Respond like the conversation never paused
- Keep the same energy and tone
- Just answer their question/respond to their message directly
- Act like you're still in the middle of the same conversation

CRITICAL: No greetings, no "back to", just continue seamlessly`;

      case 'brief_pause':
        return `${baseHistory}CONVERSATION FLOW: BRIEF PAUSE 🔄 (${timeGapMinutes}m gap)

Natural brief pause in conversation - like when someone steps away from their phone:
- Skip formal greetings but maybe a casual acknowledgment
- Continue naturally but can reference the slight gap casually
- Maybe: "yeah, about that..." or just dive back in
- Reference previous discussion naturally
- Don't make a big deal about the time gap
- Respond like friends texting throughout the day

TONE: Casual continuation, slightly acknowledging the pause but not formally`;

      case 'extended_pause':
        return `${baseHistory}CONVERSATION FLOW: EXTENDED PAUSE ⏰ (${timeGapMinutes}m gap)

Noticeable gap but still the same conversation thread:
- Lightly acknowledge the gap if natural ("sorry for the delay" or "back to your question")
- Reference what you were discussing before
- Don't restart from scratch but do recap if helpful
- Show you remember the context clearly
- Maybe bridge the gap: "so about what you were asking earlier..."
- Still conversational, not formal

TONE: Warm re-engagement, showing you remember and care`;

      case 'long_gap':
        const hours = Math.round(timeGapMinutes / 60);
        return `${baseHistory}CONVERSATION FLOW: LONG GAP 🕐 (${hours}h gap)

Significant time has passed - acknowledge thoughtfully:
- Definitely acknowledge the time gap naturally
- Show you remember the previous conversation clearly
- Maybe: "hey! picking up from earlier..." or "been thinking about what you mentioned..."
- Recap key points if helpful
- Re-establish context warmly
- Don't treat them like a stranger, but acknowledge the break

TONE: Warm reconnection, showing continuity despite the gap`;

      case 'reconnecting':
        const days = Math.round(timeGapMinutes / 1440);
        return `${baseHistory}CONVERSATION FLOW: RECONNECTING 🔄 (${days}d gap)

Long gap - reconnecting warmly but naturally:
- Acknowledge the time gap warmly ("hey there! been a while")
- Show you clearly remember who they are and what you discussed
- Offer a brief recap if it makes sense
- Re-establish rapport naturally
- Don't treat as brand new, but acknowledge the significant gap
- Bridge back to previous context: "hope you've been well! about that thing we were discussing..."

TONE: Warm reconnection, showing memory and continuity`;

      default:
        return baseHistory + `CONVERSATION FLOW: CONTINUING NATURALLY

Continue the conversation based on the context provided above.`;
    }
  }

  /**
   * Build knowledge base context section
   */
  private static buildKnowledgeBaseContext(
    documentContexts: Array<{
      documentId: string;
      documentTitle: string;
      relevantContent: string;
    }>
  ): string {
    let context = `Relevant Knowledge Base Information:

The following documents contain information relevant to this customer inquiry:`;

    documentContexts.forEach((doc, index) => {
      context += `\n\n--- Document ${index + 1}: ${doc.documentTitle} ---
${doc.relevantContent}`;
    });

    context += `\n\nUse this information to provide accurate, helpful responses that align with company policies and procedures.`;

    return context;
  }

  /**
   * Build INCREDIBLY SPECIFIC human-like task instructions based on conversation flow
   * This is where we get GRANULAR about how to respond naturally
   */
  private static buildHumanLikeTaskInstructions(
    conversationFlow: 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting',
    isOutbound: boolean | undefined,
    timeGapMinutes: number
  ): string {
    
    // Base human texting rules that apply to ALL responses
    const baseHumanRules = `
🚫 NEVER DO THESE (INSTANT FAILURE):
- Any asterisks (*) or formatting symbols
- "Hey there!" "Hi there!" "Hello there!" 
- "[Customer]" or any brackets
- "*clears throat*" or any action descriptions
- "Apologies for the confusion"
- Robotic phrases like "I'd be happy to help"

✅ ALWAYS DO THESE (HUMAN TEXTING):
- Write like you're texting a friend/family member
- Use natural, conversational language
- Just answer directly without fluff
- Be warm but not fake
- Use normal human expressions
- Text like it's coming from YOUR phone`;

    if (isOutbound) {
      const outboundFlowInstructions = this.getOutboundFlowInstructions(conversationFlow, timeGapMinutes);
      return `YOUR TASK: PROACTIVE OUTBOUND MESSAGE

${outboundFlowInstructions}

${baseHumanRules}

OUTBOUND SPECIFIC:
- Make it feel valuable, not pushy
- Give immediate value or helpful info
- Don't sound like a marketing bot
- Be genuinely helpful

Generate your natural, human-like outbound message now:`;
    }

    // Inbound response instructions based on conversation flow
    switch (conversationFlow) {
      case 'first_contact':
        return `YOUR TASK: RESPOND TO FIRST-TIME CUSTOMER

FIRST CONTACT INSTRUCTIONS:
- Start with a natural greeting (not "Hey there!")
- Be welcoming but not over-enthusiastic  
- Address their specific question/need immediately
- Don't assume any prior knowledge
- Be helpful and set a good first impression
- Example tone: "Hi! I'm [name] from [company]. [direct answer to their question]"

${baseHumanRules}

CRITICAL: This is their first impression - be genuinely helpful and human.

Generate your natural first-contact response now:`;

      case 'immediate_continuation':
        return `YOUR TASK: CONTINUE THE FLOWING CONVERSATION

IMMEDIATE CONTINUATION - NO GREETINGS:
- DO NOT start with "Hi", "Hey", "Hello" - you're already talking!
- Jump RIGHT into addressing their message
- Reference what you were just discussing
- Keep the EXACT same energy and tone as before
- Respond like you literally just got their text
- Example: "yeah about that..." or "so for the pricing..." or just direct answers

${baseHumanRules}

CRITICAL: No greetings! This conversation is FLOWING. Just continue naturally.

Generate your seamless continuation response now:`;

      case 'brief_pause':
        return `YOUR TASK: CASUAL RE-ENGAGEMENT (${timeGapMinutes}m gap)

BRIEF PAUSE - CASUAL CONTINUATION:
- Skip formal greetings but can casually acknowledge
- Maybe: "yeah," "so," "about that," or just dive in
- Reference previous discussion naturally
- Don't make the pause a big deal
- Keep conversation momentum going
- Example: "yeah, about those features you mentioned..." or "so for pricing..."

${baseHumanRules}

CRITICAL: Keep it casual and natural - like texting throughout the day.

Generate your casual continuation response now:`;

      case 'extended_pause':
        return `YOUR TASK: THOUGHTFUL RE-ENGAGEMENT (${timeGapMinutes}m gap)

EXTENDED PAUSE - ACKNOWLEDGE NATURALLY:
- Lightly acknowledge the gap if it feels natural
- "sorry for the delay" or "back to your question" 
- Show you remember what you were discussing
- Recap if helpful but don't restart from zero
- Bridge back naturally: "so about what you were asking..."
- Still conversational, not formal

${baseHumanRules}

CRITICAL: Show you remember and care, but keep it natural.

Generate your thoughtful re-engagement response now:`;

      case 'long_gap':
        const hours = Math.round(timeGapMinutes / 60);
        return `YOUR TASK: WARM RECONNECTION (${hours}h gap)

LONG GAP - ACKNOWLEDGE THE TIME:
- Definitely acknowledge the gap naturally
- Show clear memory of previous conversation
- "hey! picking up from earlier..." or "been thinking about what you mentioned"
- Recap key points if helpful
- Re-establish context warmly
- Don't treat them like a stranger

${baseHumanRules}

CRITICAL: Show continuity despite the gap - warm but natural.

Generate your warm reconnection response now:`;

      case 'reconnecting':
        const days = Math.round(timeGapMinutes / 1440);
        return `YOUR TASK: FRIENDLY RECONNECTION (${days}d gap)

RECONNECTING - WARM BUT NATURAL:
- "hey there! been a while" or similar warm acknowledgment
- Show you clearly remember them and your discussion
- Offer brief recap if it makes sense
- Re-establish rapport naturally
- Bridge to previous context: "hope you've been well! about that thing..."
- Warm but not overly formal

${baseHumanRules}

CRITICAL: Show memory and warmth without being formal or robotic.

Generate your friendly reconnection response now:`;

      default:
        return `YOUR TASK: RESPOND NATURALLY

${baseHumanRules}

Generate your natural, human-like response now:`;
    }
  }

  /**
   * Get specific outbound flow instructions
   */
  private static getOutboundFlowInstructions(
    conversationFlow: 'first_contact' | 'immediate_continuation' | 'brief_pause' | 'extended_pause' | 'long_gap' | 'reconnecting',
    timeGapMinutes: number
  ): string {
    switch (conversationFlow) {
      case 'first_contact':
        return `FIRST OUTBOUND CONTACT:
- Introduce yourself naturally
- Make immediate value clear
- Don't sound like a sales bot`;
        
      case 'immediate_continuation':
        return `CONTINUING OUTBOUND:
- No greetings - you're already talking
- Reference previous conversation
- Continue the established flow`;
        
      default:
        return `RECONNECTION OUTBOUND:
- Acknowledge the time gap naturally
- Reference previous conversation
- Provide helpful follow-up`;
    }
  }

  /**
   * Build default contact profile section (fallback if promptContext not provided)
   */
  private static buildDefaultContactProfileSection(
    contactProfile?: {
      profileId: string;
      profileText: string;
      isEmpty: boolean;
      lastUpdated: any;
    }
  ): string {
    if (!contactProfile || contactProfile.isEmpty || !contactProfile.profileText || contactProfile.profileText.trim().length === 0) {
      return `CONTACT PROFILE: NEW CUSTOMER

This is a new customer with no previous profile information.
- Build rapport naturally
- Learn about them through conversation
- No assumptions about preferences or background`;
    }

    return `CONTACT PROFILE: AI-LEARNED CUSTOMER INFORMATION

${contactProfile.profileText}

NOTE: This profile is AI-learned from previous interactions. Use this context to personalize your responses, but always prioritize current conversation context.`;
  }

  /**
   * Get a simplified prompt for basic responses (without full analysis)
   * Uses the new human-like conversation flow approach
   */
  static getSimplePrompt(
    userMessage: string,
    agentConfig: AgentConfig,
    actionData?: ActionData | null
  ): string {
    const actionContext = actionData ? {
      name: actionData.name,
      description: actionData.description,
      prompt: actionData.prompt,
      type: actionData.type
    } : undefined;

    const basePrompt = BasePrompt.getConfiguredPrompt(
      agentConfig.name,
      agentConfig.prompt,
      agentConfig.businessContext,
      'first_contact', // Simple prompts are first contact
      actionContext
    );

    return `${basePrompt}

CONVERSATION STATUS: FIRST CONTACT 🚀

This is your VERY FIRST interaction with this customer:
- You have NEVER spoken to them before
- NO previous context exists
- Start fresh with appropriate greeting
- Be welcoming but not overly familiar
- Don't reference any past conversations
- Act like you're genuinely meeting them for the first time

CURRENT MESSAGE TO RESPOND TO:
Customer just sent: "${userMessage}"

YOUR TASK: RESPOND TO FIRST-TIME CUSTOMER

FIRST CONTACT INSTRUCTIONS:
- Start with a natural greeting (not "Hey there!")
- Be welcoming but not over-enthusiastic  
- Address their specific question/need immediately
- Don't assume any prior knowledge
- Be helpful and set a good first impression
- Example tone: "Hi! I'm [name] from [company]. [direct answer to their question]"

🚫 NEVER DO THESE (INSTANT FAILURE):
- Any asterisks (*) or formatting symbols
- "Hey there!" "Hi there!" "Hello there!" 
- "[Customer]" or any brackets
- "*clears throat*" or any action descriptions
- "Apologies for the confusion"
- Robotic phrases like "I'd be happy to help"

✅ ALWAYS DO THESE (HUMAN TEXTING):
- Write like you're texting a friend/family member
- Use natural, conversational language
- Just answer directly without fluff
- Be warm but not fake
- Use normal human expressions
- Text like it's coming from YOUR phone

CRITICAL: This is their first impression - be genuinely helpful and human.

Generate your natural first-contact response now:`;
  }
}

export const buildPrompt = new BuildPrompt();