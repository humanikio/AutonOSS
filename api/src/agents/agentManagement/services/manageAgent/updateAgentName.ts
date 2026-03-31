import admin from 'firebase-admin';

interface UpdateAgentNameParams {
  name: string;
}

export const updateAgentName = async (
  tenantId: string,
  agentId: string,
  params: UpdateAgentNameParams
): Promise<void> => {
  const { name } = params;
  
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Check if agent exists
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Update the agent document with new name
    await agentRef.update({
      name: name.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Successfully updated agent name to: ${name}`);
  } catch (error) {
    console.error('Error updating agent name:', error);
    throw new Error(`Failed to update agent name: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};