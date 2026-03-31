import { AutomationWorkflow } from '../types';
import { getWorkflowFromFirestore } from '../../utils/syncAutomationFirestore';

export const getWorkflow = async (
  tenantId: string,
  workflowId: string
): Promise<AutomationWorkflow> => {
  try {
    console.log(`Fetching automation workflow ${workflowId} for tenant ${tenantId}`);

    // Get workflow from Firestore
    const workflow = await getWorkflowFromFirestore(tenantId, workflowId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    console.log(`Automation workflow found: ${workflowId}`);
    return workflow;

  } catch (error) {
    console.error('Error fetching automation workflow:', error);
    throw new Error(`Failed to fetch automation workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
