import { getContactPhoneNumber } from './startAgentPhonecall/getContactPhoneNumber';
import { getAgent11LabsConfigs } from './startAgentPhonecall/getAgent11LabsConfigs';
import { start11LabsPhoneCall } from './startAgentPhonecall/start11LabsPhoneCall';
import { saveCallRecordFirestore } from './startAgentPhonecall/saveCallRecordFirestore';

interface StartPhoneCallParams {
  tenantId: string;
  agentId: string;
  targetPhoneNumber?: string;
  contactId?: string;
  actionId?: string; // NEW: Optional action context for specialized behavior
  isTraining?: boolean; // NEW: Flag to indicate training mode
  sessionId?: string; // NEW: Training session ID for test environment
  // Contact creation fields
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface PhoneCallResult {
  conversationId: string;
  callSid: string;
  phoneNumber: string;
}

export const startAgentPhoneCall = async (params: StartPhoneCallParams): Promise<PhoneCallResult> => {
  const { tenantId, agentId, targetPhoneNumber, contactId, actionId, isTraining, sessionId, full_name, first_name, last_name, email, phone } = params;

  try {
    // Step 1: Determine phone number (contact resolution already done in controller)
    let phoneNumber: string;

    if (targetPhoneNumber) {
      // Use provided target phone number (from contact resolution or direct input)
      phoneNumber = targetPhoneNumber;
      console.log(`Using target phone number: ${phoneNumber}`);
    } else if (contactId) {
      // Fallback: Look up phone number for the resolved contact ID
      try {
        phoneNumber = await getContactPhoneNumber(tenantId, contactId);
        console.log(`Retrieved phone number for contact ${contactId}: ${phoneNumber}`);
      } catch (error) {
        // This should be rare since contact resolution already happened
        console.error(`Failed to get phone number for resolved contact ${contactId}:`, error);
        throw new Error(`Contact ${contactId} exists but has no phone number`);
      }
    } else {
      throw new Error('Either targetPhoneNumber or contactId must be provided');
    }

    // Step 1.5: Get or create conversation ID for this contact (for history context)
    let conversationId: string | undefined;
    if (contactId) {
      try {
        const { conversationManager } = await import('../../sms/services/conversationManager');
        conversationId = await conversationManager.findOrCreateConversation(tenantId, contactId);
        console.log(`Using conversation ID for history context: ${conversationId}`);

        // Ensure contact has phone address record (required for frontend display)
        const { ensureContactAddress } = await import('../../../contacts/utilities/ensureContactAddress');
        await ensureContactAddress(tenantId, contactId, 'SMS', phoneNumber);
      } catch (error) {
        console.warn('Could not create conversation ID, will proceed without conversation history:', error);
        // Non-blocking - continue without conversation ID
      }
    }

    // Step 2: Get the agent's 11Labs configuration
    const agentConfigs = await getAgent11LabsConfigs(tenantId, agentId);

    // Step 3: Start the 11Labs phone call with dynamic context
    const callResult = await start11LabsPhoneCall({
      agentId: agentConfigs.elevenLabsAgentId,
      agentPhoneNumberId: agentConfigs.elevenLabsPhoneNumberId,
      toNumber: phoneNumber,
      tenantId,
      internalAgentId: agentId,
      contactId,          // NEW: Pass contactId for custom field resolution
      conversationId,     // NEW: Pass conversationId for history context
      actionId,
      isTraining,
      sessionId
    });

    // Step 4: Save call record to Firestore
    await saveCallRecordFirestore({
      tenantId,
      agentId,
      contactId: contactId, // Use the resolved contact ID from controller
      phoneNumber,
      conversationId: callResult.conversationId,
      callSid: callResult.callSid
    });

    console.log(`Successfully started phone call for agent ${agentId} to ${phoneNumber}`);
    
    return {
      conversationId: callResult.conversationId,
      callSid: callResult.callSid,
      phoneNumber: phoneNumber
    };

  } catch (error) {
    console.error('Error starting agent phone call:', error);
    throw new Error(`Failed to start phone call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};