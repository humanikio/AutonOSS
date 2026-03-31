import admin from 'firebase-admin';
import { update11LabsAgentNumber } from './update11LabsAccountPhoneNumbers';
import { update11LabsAgentPhoneNumber } from './update11LabsAgentPhoneNumber';

interface UpdatePhoneNumberParams {
  phoneNumber: string;
  twilioSid?: string;
}

export const updateAgentPhoneNumber = async (
  tenantId: string,
  agentId: string,
  params: UpdatePhoneNumberParams
): Promise<void> => {
  const { phoneNumber, twilioSid } = params;
  
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Check if agent exists and get agent data
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const agentData = agentDoc.data();
    const agentName = `${tenantId}-${agentId}`;
    const elevenLabsAgentId = agentData?.elevenLabsAgentId;
    
    // First update 11Labs with the phone number (if twilioSid is provided)
    let elevenLabsPhoneNumberId: string | undefined;
    if (twilioSid) {
      try {
        elevenLabsPhoneNumberId = await update11LabsAgentNumber(phoneNumber, twilioSid, agentName);
        console.log(`11Labs phone number updated with ID: ${elevenLabsPhoneNumberId}`);
        
        // Step 2: Update the 11Labs agent with the phone number
        if (elevenLabsAgentId && elevenLabsPhoneNumberId) {
          await update11LabsAgentPhoneNumber(elevenLabsAgentId, elevenLabsPhoneNumberId);
          console.log(`Successfully connected phone number to 11Labs agent: ${elevenLabsAgentId}`);
        } else {
          console.log('Missing elevenLabsAgentId or elevenLabsPhoneNumberId, skipping agent phone number update');
        }
      } catch (error) {
        console.error('Failed to update 11Labs phone number:', error);
        // Continue with Firestore update even if 11Labs fails
      }
    }
    
    // Update the agent document with phone number information
    const updateData: any = {
      agentPhoneNumber: phoneNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Include Twilio SID if provided
    if (twilioSid) {
      updateData.agentPhoneNumberSid = twilioSid;
    }
    
    // Include 11Labs phone number ID if available
    if (elevenLabsPhoneNumberId) {
      updateData.elevenLabsPhoneNumberId = elevenLabsPhoneNumberId;
    }
    
    await agentRef.update(updateData);
    
    console.log(`Successfully updated phone number for agent ${agentId}:`, phoneNumber);
  } catch (error) {
    console.error('Error updating agent phone number:', error);
    throw new Error(`Failed to update agent phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};