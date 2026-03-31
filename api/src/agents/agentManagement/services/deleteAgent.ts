import { firestore } from '../../../config/firebase';

export async function deleteAgentService(tenantId: string, agentId: string): Promise<void> {
  try {
    // Get reference to the agent document
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId);
    
    // Check if the agent exists before trying to delete
    const agentDoc = await agentRef.get();
    
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Delete the agent document
    await agentRef.delete();
    
    console.log(`Deleted agent with ID: ${agentId} for tenant: ${tenantId}`);
    
  } catch (error) {
    console.error('Error deleting agent from Firestore:', error);
    throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}