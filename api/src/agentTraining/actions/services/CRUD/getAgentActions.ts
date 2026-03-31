import { firestore } from '../../../../config/firebase';

export const getAgentActionsService = async (agentId: string, tenantId: string) => {
  try {
    // Query the agent's actions subcollection
    const actionsRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('actions');

    const querySnapshot = await actionsRef
      .orderBy('createdAt', 'desc')
      .get();

    const actions = querySnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        actionId: data.actionId,
        agentId: data.agentId,
        name: data.name,
        description: data.description,
        type: data.type,
        prompt: data.prompt,
        understanding: data.understanding,
        postActionConfig: data.postActionConfig,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        usageCount: data.usageCount || 0,
        lastUsed: data.lastUsed
      };
    });

    console.log(`✅ Retrieved ${actions.length} actions for agent ${agentId}`);

    return actions;

  } catch (error) {
    console.error('❌ Error retrieving agent actions:', error);
    throw new Error(`Failed to retrieve actions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};