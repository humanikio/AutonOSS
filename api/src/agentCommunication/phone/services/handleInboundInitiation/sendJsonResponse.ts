import { getInboundDynamicVariables, validateInboundDynamicVariables } from './getDynamicVariables';

export interface ElevenLabsInitiationResponse {
  type: 'conversation_initiation_client_data';
  dynamic_variables?: Record<string, string>;
  conversation_config_override?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      first_message?: string;
      language?: string;
    };
    tts?: {
      voice_id?: string;
    };
  };
}

export interface InitiationResponseData {
  contactId: string;
  phoneNumber: string;
  agentName: string;
  wasContactCreated: boolean;
  localConversationId: string;
  tenantId: string;
  internalAgentId: string;
}

/**
 * Formats the response for ElevenLabs conversation initiation webhook
 * Includes system prompt context for better call handling
 * 
 * @param data - Basic initiation data
 * @returns ElevenLabsInitiationResponse - Formatted response for ElevenLabs
 */
export async function sendJsonResponse(data: InitiationResponseData): Promise<ElevenLabsInitiationResponse> {
  console.log(`=📞 Formatting ElevenLabs initiation response:`);
  console.log(`   - Contact: ${data.contactId}`);
  console.log(`   - Phone: ${data.phoneNumber}`);
  console.log(`   - Agent: ${data.agentName}`);
  console.log(`   - New Contact: ${data.wasContactCreated ? 'Yes' : 'No'}`);
  console.log(`   - Local Conversation ID: ${data.localConversationId}`);
  
  try {
    // Get dynamic variables including FULLY PREPARED system prompt
    const dynamicVariables = await getInboundDynamicVariables({
      tenantId: data.tenantId,
      internalAgentId: data.internalAgentId,
      contactId: data.contactId,                       // NEW: Pass contactId for custom field resolution
      localConversationId: data.localConversationId,
      phoneNumber: data.phoneNumber,
      wasContactCreated: data.wasContactCreated
    });

    // Validate dynamic variables
    if (!validateInboundDynamicVariables(dynamicVariables)) {
      console.warn('⚠️ Dynamic variables validation failed, using fallback');
      throw new Error('Dynamic variables validation failed');
    }

    const response: ElevenLabsInitiationResponse = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: dynamicVariables
    };
    
    console.log(`✅ Response formatted for ElevenLabs with context injection`);
    console.log(`   - Dynamic variables: ${Object.keys(response.dynamic_variables || {}).length}`);
    console.log(`   - System prompt: ${dynamicVariables.systemPrompt ? 'included' : 'not included'}`);
    console.log(`   - Local conversation ID included for post-call tracking`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error building dynamic variables, using fallback response:', error);
    
    // Fallback response without system prompt
    const fallbackResponse: ElevenLabsInitiationResponse = {
      type: 'conversation_initiation_client_data',
      dynamic_variables: {
        callType: 'inbound',
        callerPhone: data.phoneNumber,
        contactStatus: data.wasContactCreated ? 'new_contact' : 'existing_contact',
        localConversationId: data.localConversationId
      }
    };
    
    console.log(`⚠️ Using fallback response without system prompt`);
    return fallbackResponse;
  }
}