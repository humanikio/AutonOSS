import { firestore } from '../../../../config/firebase';

export const getActionService = async (actionId: string, tenantId: string) => {
  try {
    // Try to get from global actions collection first (more efficient)
    const globalActionRef = firestore.collection('actions').doc(actionId);
    const globalActionDoc = await globalActionRef.get();

    if (globalActionDoc.exists) {
      const actionData = globalActionDoc.data();
      
      // Verify this action belongs to the correct tenant
      if (actionData?.tenantId === tenantId) {
        return {
          actionId: actionData.actionId,
          agentId: actionData.agentId,
          name: actionData.name,
          description: actionData.description,
          type: actionData.type,
          prompt: actionData.prompt,
          understanding: actionData.understanding,
          postActionConfig: actionData.postActionConfig,
          isActive: actionData.isActive,
          createdAt: actionData.createdAt,
          updatedAt: actionData.updatedAt,
          usageCount: actionData.usageCount || 0,
          lastUsed: actionData.lastUsed
        };
      }
    }

    throw new Error('Action not found');
  } catch (error) {
    console.error('❌ Error retrieving action:', error);
    throw error;
  }
};