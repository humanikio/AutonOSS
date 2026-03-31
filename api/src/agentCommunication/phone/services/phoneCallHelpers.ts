import { firestore } from '../../../config/firebase';
import { actionPromptService, ActionData } from '../../sms/services/actionPromptService';

/**
 * Helper services for phone call dynamic variable population
 * Combines system prompts and action context for 11Labs injection
 */

export interface PhoneCallContext {
  systemPrompt: string;
  actionContext: string;
}

export class PhoneCallHelpers {
  /**
   * Get system prompt from existing Firestore agent document
   * In training mode, fetches from test environment configuration
   */
  async getSystemPrompt(
    tenantId: string, 
    agentId: string,
    isTraining?: boolean,
    sessionId?: string
  ): Promise<string> {
    try {
      console.log(`📋 Fetching system prompt for agent: ${agentId}${isTraining ? ' (Training Mode)' : ''}`);
      
      // In training mode, try to fetch from test environment first
      if (isTraining && sessionId) {
        console.log(`🧪 Training mode: Fetching test agent config for session ${sessionId}`);
        
        const testAgentRef = firestore
          .collection('tenants').doc(tenantId)
          .collection('trainingSessions').doc(sessionId)
          .collection('testAgent').doc(agentId);
        
        const testAgentDoc = await testAgentRef.get();
        
        if (testAgentDoc.exists) {
          const testData = testAgentDoc.data();
          const testPrompt = testData?.systemPrompt || testData?.prompt;
          
          if (testPrompt) {
            console.log(`✅ Using test environment system prompt (${testPrompt.length} characters)`);
            return testPrompt;
          } else {
            console.warn('⚠️ Test agent exists but has no system prompt, falling back to live agent');
          }
        } else {
          console.warn('⚠️ Test agent not found, falling back to live agent configuration');
        }
      }
      
      // Default/fallback: Get live agent configuration
      console.log(isTraining ? '🔄 Falling back to live agent configuration' : '🔴 Production mode: Using live agent');
      
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);
      
      const agentDoc = await agentRef.get();
      
      if (!agentDoc.exists) {
        console.warn(`⚠️ Agent ${agentId} not found`);
        return 'You are a helpful customer service representative. Be professional, friendly, and assist the caller with their needs.';
      }

      const agentData = agentDoc.data();
      const prompt = agentData?.prompt || 
                    agentData?.llmSettings?.prompt || 
                    agentData?.conversation?.agent?.prompt?.prompt;
      
      if (!prompt) {
        console.warn(`⚠️ No system prompt found for agent ${agentId}, using default`);
        return 'You are a helpful customer service representative. Be professional, friendly, and assist the caller with their needs.';
      }
      
      console.log(`✅ System prompt loaded (${prompt.length} characters)`);
      return prompt;
    } catch (error) {
      console.error('Error fetching system prompt for phone call:', error);
      return 'You are a helpful customer service representative. Be professional, friendly, and assist the caller with their needs.';
    }
  }

  /**
   * Get action context for dynamic variable injection
   */
  async getActionContext(tenantId: string, agentId: string, actionId: string): Promise<string> {
    try {
      console.log(`🎯 Fetching action context for: ${actionId}`);
      
      const actionData = await actionPromptService.getActionData({
        actionId,
        tenantId,
        agentId
      });

      if (!actionData) {
        console.warn(`⚠️ No action data found for ${actionId}`);
        return '';
      }

      if (!actionPromptService.validateActionData(actionData)) {
        console.warn(`⚠️ Action ${actionId} validation failed`);
        return '';
      }

      // Format action context for phone call injection
      const actionContext = this.formatActionContextForPhone(actionData);
      
      console.log(`✅ Action context loaded: ${actionData.name} (${actionData.type})`);
      console.log(`📋 Action context length: ${actionContext.length} characters`);
      
      return actionContext;
    } catch (error) {
      console.error('Error fetching action context for phone call:', error);
      return '';
    }
  }

  /**
   * Format action data into context string suitable for phone calls
   */
  private formatActionContextForPhone(actionData: ActionData): string {
    let context = `Action: ${actionData.name} (${actionData.type})\n`;
    context += `Description: ${actionData.description}\n\n`;
    context += `Behavioral Instructions:\n${actionData.prompt}`;

    // Add action type specific guidance
    if (actionData.understanding) {
      context += `\n\nAction Understanding:`;
      context += `\n- Summary: ${actionData.understanding.summary}`;
      context += `\n- Behavior: ${actionData.understanding.behavior}`;
      context += `\n- Tone: ${actionData.understanding.tone}`;
      
      if (actionData.understanding.keyPoints && actionData.understanding.keyPoints.length > 0) {
        context += `\n- Key Points: ${actionData.understanding.keyPoints.join(', ')}`;
      }
      
      if (actionData.understanding.confidence) {
        context += `\n- Confidence Level: ${actionData.understanding.confidence}`;
      }
    }

    return context;
  }

  /**
   * Get complete phone call context (system prompt + action context)
   * NOW ENHANCED: Resolves custom fields and injects contact overview
   */
  async getPhoneCallContext(
    tenantId: string,
    agentId: string,
    contactId: string,           // NEW: Required for custom field resolution and contact overview
    actionId?: string,
    isTraining?: boolean,
    sessionId?: string,
    conversationId?: string,     // NEW: For conversation history
    callDirection?: 'inbound' | 'outbound' // NEW: Direction of the call
  ): Promise<PhoneCallContext> {
    try {
      console.log(`📞 Building phone call context for agent: ${agentId}${actionId ? ` with action: ${actionId}` : ''}`);
      console.log(`   Contact ID: ${contactId}`);

      // Fetch system prompt and action context in parallel
      const [rawSystemPrompt, actionContext] = await Promise.all([
        this.getSystemPrompt(tenantId, agentId, isTraining, sessionId),
        actionId ? this.getActionContext(tenantId, agentId, actionId) : Promise.resolve('')
      ]);

      console.log(`✅ Raw prompts fetched:`);
      console.log(`  - System prompt: ${rawSystemPrompt.length} characters`);
      console.log(`  - Action context: ${actionContext.length} characters`);

      // NEW: Prepare system prompt with custom field resolution + contact overview injection
      console.log(`\n🔧 Preparing system prompt with custom fields and contact overview...`);
      const preparedSystemPrompt = await this.prepareSystemPromptForCall({
        tenantId,
        contactId,
        systemPrompt: rawSystemPrompt,
        conversationId,
        sessionId,
        isTraining,
        callDirection
      });

      const context: PhoneCallContext = {
        systemPrompt: preparedSystemPrompt,
        actionContext: actionContext || 'general'
      };

      console.log(`\n✅ Phone call context fully assembled and prepared:`);
      console.log(`  - Final system prompt: ${preparedSystemPrompt.length} characters`);
      console.log(`  - Action context: ${actionContext.length} characters`);
      console.log(`  - Context enhancement: +${preparedSystemPrompt.length - rawSystemPrompt.length} characters\n`);

      return context;
    } catch (error) {
      console.error('Error building phone call context:', error);

      // Return fallback context
      return {
        systemPrompt: 'You are a helpful customer service representative. Be professional, friendly, and assist the caller with their needs.',
        actionContext: ''
      };
    }
  }

  /**
   * NEW: Prepare system prompt with custom field resolution + contact overview injection
   * This is the integration point for the new prepareSystemPrompt service
   */
  private async prepareSystemPromptForCall(params: {
    tenantId: string;
    contactId: string;
    systemPrompt: string;
    conversationId?: string;
    sessionId?: string;
    isTraining?: boolean;
    callDirection?: 'inbound' | 'outbound';
  }): Promise<string> {
    try {
      // Import and call prepareSystemPrompt service
      const { prepareSystemPrompt } = await import('./prepareSystemPrompt');

      const result = await prepareSystemPrompt.prepare({
        tenantId: params.tenantId,
        contactId: params.contactId,
        systemPrompt: params.systemPrompt,
        conversationId: params.conversationId,
        sessionId: params.sessionId,
        isTraining: params.isTraining,
        callDirection: params.callDirection
      });

      console.log(`📊 Preparation summary:`);
      console.log(`   Custom fields found: ${result.customFieldsFound.length}`);
      console.log(`   Custom fields resolved: ${Object.keys(result.customFieldsResolved).length - result.customFieldsNotFound.length}`);
      console.log(`   Contact overview injected: ${result.contactOverviewInjected ? 'Yes' : 'No'}`);

      return result.preparedPrompt;
    } catch (error) {
      console.error('❌ Error preparing system prompt, using raw prompt as fallback:', error);
      // Return original prompt on error to avoid breaking calls
      return params.systemPrompt;
    }
  }

  /**
   * Validate that required context is available for phone call
   */
  validatePhoneCallContext(context: PhoneCallContext): boolean {
    if (!context.systemPrompt || context.systemPrompt.trim().length === 0) {
      console.error('❌ Phone call validation failed: No system prompt');
      return false;
    }

    // Action context is optional, so no validation needed
    
    console.log('✅ Phone call context validation passed');
    return true;
  }
}

export const phoneCallHelpers = new PhoneCallHelpers();