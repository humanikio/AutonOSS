/**
 * Tool: Call Read Workflow
 * Reads workflow and extracts n8n webhook URL
 */

import { getWorkflow } from '../../../../services/workflowCrudManager';

export interface ReadWorkflowInput {
  tenantId: string;
  workflowId: string;
}

export interface ReadWorkflowResult {
  success: boolean;
  workflowId: string;
  webhookUrl: string | null;
  triggers?: any[];
}

/**
 * Read workflow and extract webhook URL from n8n config
 */
export async function callReadWorkflow(
  input: ReadWorkflowInput
): Promise<ReadWorkflowResult> {
  const { tenantId, workflowId } = input;

  console.log(`=Ö Reading workflow: ${workflowId}`);

  // Get workflow with n8n config
  const workflow = await getWorkflow(tenantId, workflowId);

  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  // Extract webhook URL from triggers array (attached by getWorkflow when n8n config exists)
  const triggers = (workflow as any).triggers;

  if (!triggers || triggers.length === 0) {
    console.warn(`   No triggers found for workflow ${workflowId} - workflow may not be public/synced to n8n`);
    return {
      success: false,
      workflowId,
      webhookUrl: null,
      triggers: []
    };
  }

  // Find webhook trigger
  const webhookTrigger = triggers.find((t: any) => t.triggerType === 'webhook' && t.url);

  if (!webhookTrigger || !webhookTrigger.url) {
    console.warn(`   No webhook URL found for workflow ${workflowId}`);
    return {
      success: false,
      workflowId,
      webhookUrl: null,
      triggers
    };
  }

  console.log(` Found webhook URL: ${webhookTrigger.url}`);

  return {
    success: true,
    workflowId,
    webhookUrl: webhookTrigger.url,
    triggers
  };
}
