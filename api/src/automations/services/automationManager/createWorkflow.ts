import { CreateWorkflowData, AutomationWorkflow } from '../types';
import { createWorkflowInFirestore } from '../../utils/syncAutomationFirestore';

export const createWorkflow = async (
  tenantId: string,
  workflowData: CreateWorkflowData
): Promise<AutomationWorkflow> => {
  try {
    console.log(`Creating automation workflow for tenant ${tenantId}`);

    // Create workflow in Firestore
    const workflow = await createWorkflowInFirestore(tenantId, workflowData);

    console.log(`Automation workflow created: ${workflow.workflowId}`);
    return workflow;

  } catch (error) {
    console.error('Error creating automation workflow:', error);
    throw new Error(`Failed to create automation workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
