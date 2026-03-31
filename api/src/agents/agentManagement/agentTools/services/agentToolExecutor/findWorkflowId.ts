import { getFirestore } from 'firebase-admin/firestore';

export interface FindWorkflowIdInput {
  tenantId: string;
  agentId: string;
  toolId: string;
}

/**
 * Finds the workflowId associated with an agent tool
 * Reads the tool document configured in agentToolManager
 *
 * @param input - Tenant, agent, and tool identifiers
 * @returns workflowId
 * @throws Error if tool not found or workflowId not configured
 */
export const findWorkflowId = async (input: FindWorkflowIdInput): Promise<string> => {
  const { tenantId, agentId, toolId } = input;
  const db = getFirestore();

  console.log(`= Looking up workflow for tool: ${toolId}`);

  // Read tool document
  const toolDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .get();

  if (!toolDoc.exists) {
    throw new Error(`Tool not found: ${toolId} for agent: ${agentId}`);
  }

  const toolData = toolDoc.data();
  const workflowId = toolData?.workflowId;

  if (!workflowId) {
    throw new Error(
      `Tool ${toolId} is not configured with a workflowId. ` +
      'Please update the tool configuration to include a workflow.'
    );
  }

  console.log(` Found workflow: ${workflowId} for tool: ${toolId}`);

  return workflowId;
};
