import { firestore } from '../../../../config/firebase';
import { getActionService } from './getAction';

interface UpdateActionData {
  name?: string;
  description?: string;
  type?: 'nurture' | 'support' | 'followup' | 'custom';
  prompt?: string;
  understanding?: any;
  postActionConfig?: any;
  isActive?: boolean;
}

export const updateActionService = async (
  actionId: string, 
  tenantId: string, 
  userId: string, 
  updateData: UpdateActionData
) => {
  try {
    // First verify the action exists and belongs to this tenant
    const existingAction = await getActionService(actionId, tenantId);
    
    if (!existingAction) {
      throw new Error('Action not found');
    }

    const timestamp = new Date().toISOString();
    const updateFields = {
      ...updateData,
      updatedAt: timestamp,
      updatedBy: userId,
      version: (existingAction as any).version ? (existingAction as any).version + 1 : 2
    };

    // Update in global actions collection
    const globalActionRef = firestore.collection('actions').doc(actionId);
    await globalActionRef.update(updateFields);

    // Also update in the agent's actions subcollection
    const actionRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(existingAction.agentId)
      .collection('actions')
      .doc(actionId);

    await actionRef.update(updateFields);

    console.log(`✅ Action updated successfully: ${actionId}`);

    // Return the updated action
    return {
      ...existingAction,
      ...updateFields
    };

  } catch (error) {
    console.error('❌ Error updating action:', error);
    throw error;
  }
};