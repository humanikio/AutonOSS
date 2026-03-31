import { runWorkflow } from '../../../../../workflows/services/runWorkflow';

export interface ExecuteWorkflowInput {
  tenantId: string;
  workflowId: string;
  payload: Record<string, any>;
}

/**
 * Executes a workflow directly via internal import (not HTTP POST)
 * Uses the same runWorkflow service as the workflow trigger endpoint
 *
 * @param input - Tenant ID, workflow ID, and payload
 * @returns Workflow execution result
 */
export const executeWorkflow = async (input: ExecuteWorkflowInput): Promise<any> => {
  const { tenantId, workflowId, payload } = input;

  console.log(`=€ Executing workflow: ${workflowId}`);
  console.log('=æ Payload:', payload);

  // Call runWorkflow directly (same as triggerWorkflowController)
  const result = await runWorkflow(tenantId, workflowId, payload);

  console.log(' Workflow execution completed:', result);

  return result;
};
