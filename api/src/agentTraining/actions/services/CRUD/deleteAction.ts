import { firestore } from '../../../../config/firebase';
import { getActionService } from './getAction';

export const deleteActionService = async (actionId: string, tenantId: string) => {
  try {
    // First verify the action exists and belongs to this tenant
    const existingAction = await getActionService(actionId, tenantId);
    
    if (!existingAction) {
      throw new Error('Action not found');
    }

    // Delete from global actions collection
    const globalActionRef = firestore.collection('actions').doc(actionId);
    await globalActionRef.delete();

    // Also delete from the agent's actions subcollection
    const actionRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(existingAction.agentId)
      .collection('actions')
      .doc(actionId);

    await actionRef.delete();

    console.log(`✅ Action deleted successfully: ${actionId}`);

    return { success: true };

  } catch (error) {
    console.error('❌ Error deleting action:', error);
    throw error;
  }
};