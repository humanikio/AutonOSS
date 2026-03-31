interface Start11LabsCallParams {
  agentId: string;
  agentPhoneNumberId: string;
  toNumber: string;
  tenantId?: string; // NEW: For fetching internal context
  internalAgentId?: string; // NEW: Internal agent ID for context lookup
  contactId?: string; // NEW: Contact ID for custom field resolution and contact overview
  conversationId?: string; // NEW: Conversation ID for history context
  actionId?: string; // NEW: Optional action context
  isTraining?: boolean; // NEW: Flag to indicate training mode
  sessionId?: string; // NEW: Training session ID for test environment
}

interface Start11LabsCallResult {
  conversationId: string;
  callSid: string;
}

const validateE164PhoneNumber = (phoneNumber: string): boolean => {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

const formatToE164 = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with +, add +1 for US numbers (assuming US if no country code)
  if (!phoneNumber.startsWith('+')) {
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else {
      return `+${digitsOnly}`;
    }
  }
  
  return phoneNumber;
};

import { phoneCallHelpers } from '../phoneCallHelpers';

export const start11LabsPhoneCall = async (params: Start11LabsCallParams): Promise<Start11LabsCallResult> => {
  const { agentId, agentPhoneNumberId, toNumber, tenantId, internalAgentId, contactId, conversationId, actionId, isTraining, sessionId } = params;
  
  try {
    // Format and validate phone number
    const formattedNumber = formatToE164(toNumber);
    
    if (!validateE164PhoneNumber(formattedNumber)) {
      throw new Error(`Invalid phone number format: ${formattedNumber}. Must be in E.164 format.`);
    }
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    
    // Build base request body
    const requestBody: any = {
      agent_id: agentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: formattedNumber
    };

    // Add dynamic variables if we have the required context data
    if (tenantId && internalAgentId && contactId) {
      try {
        console.log(`🎯 Building dynamic variables for agent ${internalAgentId}${actionId ? ` with action ${actionId}` : ''}`);
        console.log(`   Contact ID: ${contactId}`);
        console.log(`   Conversation ID: ${conversationId || 'Not provided'}`);

        const callContext = await phoneCallHelpers.getPhoneCallContext(
          tenantId,
          internalAgentId,
          contactId,        // NEW: Pass contact ID for custom field resolution
          actionId,
          isTraining,
          sessionId,
          conversationId,   // NEW: Pass conversation ID for history context
          'outbound'        // callDirection - outbound call
        );

        if (phoneCallHelpers.validatePhoneCallContext(callContext)) {
          requestBody.conversation_initiation_client_data = {
            type: "conversation_initiation_client_data",
            dynamic_variables: {
              systemPrompt: callContext.systemPrompt,
              actionContext: callContext.actionContext
            }
          };

          console.log(`✅ Dynamic variables added:`);
          console.log(`  - System prompt: ${callContext.systemPrompt.length} chars`);
          console.log(`  - Action context: ${callContext.actionContext.length} chars`);
        } else {
          console.warn('⚠️ Dynamic variables validation failed, using template defaults');
        }
      } catch (error) {
        console.error('❌ Error building dynamic variables, using template defaults:', error);
      }
    } else {
      console.log('📋 Missing required context for prompt preparation (need tenantId, internalAgentId, and contactId), using template defaults');
      if (!tenantId) console.log('   ⚠️ Missing: tenantId');
      if (!internalAgentId) console.log('   ⚠️ Missing: internalAgentId');
      if (!contactId) console.log('   ⚠️ Missing: contactId');
    }
    
    console.log('Making 11Labs outbound call request:', {
      agent_id: agentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: formattedNumber,
      has_dynamic_variables: !!requestBody.conversation_initiation_client_data
    });
    
    const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`11Labs API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json() as any;

    console.log('11Labs API response:', result);

    // Handle different possible response formats
    const elevenLabsConversationId = result.conversation_id || result.conversationId || result.id;
    const callSid = result.call_sid || result.callSid || result.sid;

    if (!elevenLabsConversationId && !callSid) {
      console.error('Unexpected 11Labs API response format:', result);
      // If call was successful but response format is unexpected, return a placeholder
      return {
        conversationId: 'unknown',
        callSid: 'unknown'
      };
    }

    console.log('Successfully initiated 11Labs phone call:', {
      conversationId: elevenLabsConversationId || 'unknown',
      callSid: callSid || 'unknown'
    });

    return {
      conversationId: elevenLabsConversationId || 'unknown',
      callSid: callSid || 'unknown'
    };
    
  } catch (error) {
    console.error('Error starting 11Labs phone call:', error);
    throw new Error(`Failed to start 11Labs phone call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};