import admin from 'firebase-admin';

interface Agent11LabsConfigs {
  elevenLabsAgentId: string;
  elevenLabsPhoneNumberId: string;
}

export const getAgent11LabsConfigs = async (tenantId: string, agentId: string): Promise<Agent11LabsConfigs> => {
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    const agentData = agentDoc.data();
    const elevenLabsAgentId = agentData?.elevenLabsAgentId;
    const elevenLabsPhoneNumberId = agentData?.elevenLabsPhoneNumberId;
    
    if (!elevenLabsAgentId) {
      throw new Error(`No 11Labs agent ID found for agent ${agentId}`);
    }
    
    if (!elevenLabsPhoneNumberId) {
      throw new Error(`No 11Labs phone number ID found for agent ${agentId}`);
    }
    
    console.log(`Retrieved 11Labs configs for agent ${agentId}:`, {
      elevenLabsAgentId,
      elevenLabsPhoneNumberId
    });
    
    return {
      elevenLabsAgentId,
      elevenLabsPhoneNumberId
    };
    
  } catch (error) {
    console.error('Error getting agent 11Labs configs:', error);
    throw new Error(`Failed to get agent 11Labs configs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};