import { UpdateWorkflowData } from '../types';
import { updateWorkflowInFirestore } from '../../utils/syncAutomationFirestore';

export const updateWorkflow = async (
  tenantId: string,
  workflowId: string,
  updateData: UpdateWorkflowData
): Promise<void> => {
  try {
    console.log(`Updating automation workflow ${workflowId} for tenant ${tenantId}`);

    // Update workflow in Firestore
    await updateWorkflowInFirestore(tenantId, workflowId, updateData);

    console.log(`Automation workflow updated: ${workflowId}`);

  } catch (error) {
    console.error('Error updating automation workflow:', error);
    throw new Error(`Failed to update automation workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
