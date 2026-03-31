import { deleteWorkflowFromFirestore } from '../../utils/syncAutomationFirestore';

export const deleteWorkflow = async (
  tenantId: string,
  workflowId: string
): Promise<void> => {
  try {
    console.log(`Deleting automation workflow ${workflowId} for tenant ${tenantId}`);

    // Delete workflow from Firestore
    await deleteWorkflowFromFirestore(tenantId, workflowId);

    console.log(`Automation workflow deleted: ${workflowId}`);

  } catch (error) {
    console.error('Error deleting automation workflow:', error);
    throw new Error(`Failed to delete automation workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
