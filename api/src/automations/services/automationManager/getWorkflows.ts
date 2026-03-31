import { AutomationWorkflow } from '../types';
import { getAllWorkflowsFromFirestore } from '../../utils/syncAutomationFirestore';

export const getWorkflows = async (
  tenantId: string
): Promise<AutomationWorkflow[]> => {
  try {
    console.log(`Fetching automation workflows for tenant ${tenantId}`);

    // Get all workflows from Firestore
    const workflows = await getAllWorkflowsFromFirestore(tenantId);

    console.log(`Found ${workflows.length} automation workflows`);
    return workflows;

  } catch (error) {
    console.error('Error fetching automation workflows:', error);
    throw new Error(`Failed to fetch automation workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
