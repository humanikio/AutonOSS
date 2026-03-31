import { resolveInboundAgent } from './handleInboundInitiation/resolveInboundAgent';
import { resolveInboundContact } from './handleInboundInitiation/resolveInboundContact';
import { saveInboundCallRecord } from './handleInboundInitiation/saveInboundCallRecord';
import { sendJsonResponse, type ElevenLabsInitiationResponse } from './handleInboundInitiation/sendJsonResponse';
import { generateInboundConversationId } from './handleInboundInitiation/generateInboundConversationId';

export interface InboundInitiationParams {
  caller_id: string;      // Phone number of the caller
  agent_id: string;       // ElevenLabs agent ID receiving the call
  called_number: string;  // Twilio number that was called
  call_sid: string;       // Unique identifier for the Twilio call
}

/**
 * Main orchestrator service for handling inbound call initiation webhooks from ElevenLabs
 * 
 * Flow:
 * 1. Resolve ElevenLabs agent ID to internal tenant/agent data
 * 2. Resolve caller phone number to internal contact (create if needed)
 * 3. Create phone record and mapping for post-call processing
 * 4. Return formatted response to ElevenLabs for call initiation
 * 
 * @param params - Inbound initiation parameters from webhook
 * @returns Promise<ElevenLabsInitiationResponse> - Response for ElevenLabs
 */
export async function handleInboundInitiationService(
  params: InboundInitiationParams
): Promise<ElevenLabsInitiationResponse> {
  try {
    console.log('🚀 Starting inbound call initiation flow:');
    console.log(`   - Caller: ${params.caller_id}`);
    console.log(`   - Agent ID: ${params.agent_id}`);
    console.log(`   - Called Number: ${params.called_number}`);
    console.log(`   - Call SID: ${params.call_sid}`);
    
    // Step 1: Resolve ElevenLabs agent ID to internal data
    console.log('\\n🔍 Step 1: Resolving agent...');
    const agentResolution = await resolveInboundAgent(params.agent_id);
    
    // Step 2: Resolve caller phone number to contact
    console.log('\\n📞 Step 2: Resolving contact...');
    const contactResolution = await resolveInboundContact(
      agentResolution.tenantId,
      params.caller_id
    );
    
    // Step 3: Generate local conversation ID for post-call tracking
    console.log('\\n🆔 Step 3: Generating local conversation ID...');
    const localConversationId = generateInboundConversationId();
    
    // Step 4: Save inbound call record for post-call processing
    // Note: We now use our generated local conversation ID which will be passed 
    // through dynamic variables to ensure reliable post-call resolution
    console.log('\\n📝 Step 4: Saving call record...');
    await saveInboundCallRecord({
      tenantId: agentResolution.tenantId,
      agentId: agentResolution.internalAgentId,
      contactId: contactResolution.contactId,
      phoneNumber: contactResolution.phoneNumber,
      conversationId: localConversationId, // Use our generated ID for mapping
      callSid: params.call_sid
    });
    
    // Step 5: Format response for ElevenLabs
    console.log('\\n📤 Step 5: Formatting response...');
    const response = await sendJsonResponse({
      contactId: contactResolution.contactId,
      phoneNumber: contactResolution.phoneNumber,
      agentName: agentResolution.agentName,
      wasContactCreated: contactResolution.wasCreated,
      localConversationId: localConversationId,
      tenantId: agentResolution.tenantId,
      internalAgentId: agentResolution.internalAgentId
    });
    
    console.log('\\n✅ Inbound call initiation completed successfully');
    console.log(`   - Contact: ${contactResolution.contactId} (${contactResolution.wasCreated ? 'created' : 'existing'})`);
    console.log(`   - Agent: ${agentResolution.agentName} (${agentResolution.internalAgentId})`);
    console.log(`   - Local Conversation ID: ${localConversationId}`);
    console.log(`   - Mapping: ${localConversationId} → ${agentResolution.tenantId}/${contactResolution.contactId}`);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error in inbound call initiation:', error);
    
    // Return minimal response to not block the call
    // ElevenLabs needs a response to continue the call flow
    // Generate ID even in error case for potential manual resolution
    const errorConversationId = generateInboundConversationId();
    
    return {
      type: 'conversation_initiation_client_data',
      dynamic_variables: {
        callType: 'inbound',
        callerPhone: params.caller_id,
        contactStatus: 'error_resolution_failed',
        localConversationId: errorConversationId
      }
    };
  }
}