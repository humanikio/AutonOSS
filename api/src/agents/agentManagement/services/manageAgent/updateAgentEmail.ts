import admin from 'firebase-admin';

interface UpdateEmailParams {
  email: string;
  emailId?: string;
}

export const updateAgentEmail = async (
  tenantId: string,
  agentId: string,
  params: UpdateEmailParams
): Promise<void> => {
  const { email, emailId } = params;
  
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Check if agent exists
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Update agent email information
    const updateData: any = {
      agentEmail: email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (emailId) {
      updateData.agentEmailId = emailId;
    }
    
    await agentRef.update(updateData);
    
    console.log(`Successfully updated email for agent ${agentId}: ${email}`);
  } catch (error) {
    console.error(`Error updating email for agent:`, error);
    throw new Error(`Failed to update agent email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};