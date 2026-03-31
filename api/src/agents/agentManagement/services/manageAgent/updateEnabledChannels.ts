import admin from 'firebase-admin';

interface UpdateEnabledChannelsParams {
  channelType: 'voice' | 'sms' | 'email' | 'webhook';
  enabled: boolean;
}

export const updateEnabledChannels = async (
  tenantId: string,
  agentId: string,
  params: UpdateEnabledChannelsParams
): Promise<void> => {
  const { channelType, enabled } = params;
  
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    // Check if agent exists
    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Create the field name based on channel type
    const fieldName = `channels.${channelType}.enabled`;
    
    // Update the specific channel's enabled status
    const updateData: any = {
      [fieldName]: enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await agentRef.update(updateData);
    
    console.log(`Successfully updated ${channelType} channel for agent ${agentId}: ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error(`Error updating ${channelType} channel for agent:`, error);
    throw new Error(`Failed to update ${channelType} channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};