import axios from 'axios';
import { getWorkflow } from './workflowCrudManager';
import { resolveLiveUrl } from './runWorkflow/resolveLiveUrl';

/**
 * Triggers a workflow by posting to its production webhook URL
 *
 * @param tenantId - Tenant ID
 * @param workflowId - Workflow ID to trigger
 * @param payload - Optional payload to send to the workflow
 * @returns Execution result from the workflow
 */
export const runWorkflow = async (
  tenantId: string,
  workflowId: string,
  payload?: any
): Promise<{
  success: boolean;
  executionId?: string;
  workflowId: string;
  message: string;
  data?: any;
}> => {
  console.log(`=€ Triggering workflow: ${workflowId}`);

  // 1. Get workflow details
  const workflow = await getWorkflow(tenantId, workflowId);

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  console.log(`=Ë Found workflow: "${workflow.name}"`);

  // 2. Resolve production webhook URL
  const productionUrl = resolveLiveUrl(workflow);

  // 3. POST to production webhook URL with payload
  try {
    console.log(`=ä Posting to production URL: ${productionUrl}`);
    console.log(`=æ Payload:`, payload);

    const response = await axios.post(productionUrl, payload || {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    console.log(` Workflow triggered successfully. Status: ${response.status}`);

    return {
      success: true,
      executionId: response.data?.executionId || response.data?.id,
      workflowId,
      message: `Workflow "${workflow.name}" triggered successfully`,
      data: response.data,
    };
  } catch (error: any) {
    console.error(`L Failed to trigger workflow:`, error.message);

    // Return structured error
    throw new Error(
      `Failed to trigger workflow "${workflow.name}": ${error.message}`
    );
  }
};
