import admin from 'firebase-admin';

interface ActivateAgentParams {
  status: 'active' | 'draft' | 'paused';
}

export const activateAgent = async (
  tenantId: string,
  agentId: string,
  params: ActivateAgentParams
): Promise<void> => {
  const { status } = params;
  
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Check if agent exists
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Update the agent document with new status
    await agentRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully updated agent status to: ${status}`);
  } catch (error) {
    console.error('Error updating agent status:', error);
    throw new Error(`Failed to update agent status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};