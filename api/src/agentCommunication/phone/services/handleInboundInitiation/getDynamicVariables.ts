import { phoneCallHelpers } from '../phoneCallHelpers';

interface InboundDynamicVariablesParams {
  tenantId: string;
  internalAgentId: string;
  contactId: string;              // NEW: Required for custom field resolution and contact overview
  localConversationId: string;
  phoneNumber: string;
  wasContactCreated: boolean;
}

interface InboundDynamicVariables {
  callType: string;
  callerPhone: string;
  contactStatus: string;
  localConversationId: string;
  systemPrompt?: string;
}

/**
 * Gets dynamic variables for inbound calls including FULLY PREPARED system prompt
 * NOW ENHANCED: Uses getPhoneCallContext for custom field resolution + contact overview injection
 *
 * @param params - Inbound call parameters
 * @returns Dynamic variables object for ElevenLabs injection
 */
export async function getInboundDynamicVariables(
  params: InboundDynamicVariablesParams
): Promise<Record<string, string>> {
  const { tenantId, internalAgentId, contactId, localConversationId, phoneNumber, wasContactCreated } = params;

  // Base dynamic variables (always included as strings)
  const baseVariables: Record<string, string> = {
    callType: 'inbound',
    callerPhone: phoneNumber,
    contactStatus: wasContactCreated ? 'new_contact' : 'existing_contact',
    localConversationId: localConversationId
  };

  try {
    console.log(`🎯 Building inbound dynamic variables for agent ${internalAgentId}`);
    console.log(`   Contact ID: ${contactId}`);
    console.log(`   Conversation ID: ${localConversationId}`);

    // NEW: Get FULLY PREPARED system prompt with custom fields + contact overview
    // Uses the same preparation system as outbound calls
    console.log(`\n🔧 Preparing system prompt with custom fields and contact overview...`);
    const callContext = await phoneCallHelpers.getPhoneCallContext(
      tenantId,
      internalAgentId,
      contactId,           // NEW: Contact resolved from caller phone number
      undefined,           // actionId - inbound calls have no specific action
      false,               // isTraining - inbound calls are always production
      undefined,           // sessionId - not applicable for inbound
      localConversationId, // conversationId - use local ID for history lookup
      'inbound'            // callDirection - inbound call
    );

    if (callContext.systemPrompt && callContext.systemPrompt.length > 0) {
      baseVariables.systemPrompt = callContext.systemPrompt;
      console.log(`✅ PREPARED system prompt added to dynamic variables (${callContext.systemPrompt.length} chars)`);
      console.log(`   - Custom fields resolved and injected`);
      console.log(`   - Contact overview and history injected`);
    } else {
      console.warn('⚠️ No system prompt found, using base variables only');
    }

    console.log(`\n✅ Inbound dynamic variables assembled:`);
    console.log(`  - Base variables: ${Object.keys(baseVariables).filter(k => k !== 'systemPrompt').length}`);
    console.log(`  - System prompt: ${callContext.systemPrompt ? 'FULLY PREPARED' : 'not included'}\n`);

    return baseVariables;

  } catch (error) {
    console.error('❌ Error building inbound dynamic variables, using base only:', error);
    // Return base variables without system prompt
    const { systemPrompt, ...safeVariables } = baseVariables;
    return safeVariables;
  }
}

/**
 * Validates that dynamic variables are properly formatted
 * All values must be strings for ElevenLabs compatibility
 */
export function validateInboundDynamicVariables(variables: Record<string, string>): boolean {
  try {
    // Check all required fields are present and are strings
    const requiredFields = ['callType', 'callerPhone', 'contactStatus', 'localConversationId'];
    
    for (const field of requiredFields) {
      const value = variables[field];
      if (!value || typeof value !== 'string') {
        console.warn(`⚠️ Dynamic variables validation failed: ${field} is missing or not a string`);
        return false;
      }
    }
    
    // Check all values are strings (including optional ones like systemPrompt)
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'string') {
        console.warn(`⚠️ Dynamic variables validation failed: ${key} is not a string`);
        return false;
      }
    }
    
    console.log(`✅ Inbound dynamic variables validation passed`);
    return true;
    
  } catch (error) {
    console.error('❌ Error validating inbound dynamic variables:', error);
    return false;
  }
}