import { findWorkflowId } from './agentToolExecutor/findWorkflowId';
import { formatPayload } from './agentToolExecutor/formatPayload';
import { executeWorkflow } from './agentToolExecutor/executeWorkflow';

export interface ExecuteAgentToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  payload: any;
}

export interface ExecuteAgentToolResult {
  success: boolean;
  workflowId: string;
  executionId?: string;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Agent Tool Executor Orchestrator
 *
 * Orchestrates the execution of an agent tool by:
 * 1. Finding the associated workflowId from Firestore
 * 2. Formatting the payload to match workflow input requirements
 * 3. Executing the workflow directly via runWorkflow
 *
 * @param input - Tool execution parameters
 * @returns Workflow execution result
 */
export const executeAgentTool = async (
  input: ExecuteAgentToolInput
): Promise<ExecuteAgentToolResult> => {
  const { tenantId, agentId, toolId, payload } = input;

  console.log('🔧 Starting agent tool execution:', {
    tenantId,
    agentId,
    toolId,
  });

  try {
    // Step 1: Find the workflowId
    const workflowId = await findWorkflowId({ tenantId, agentId, toolId });

    // Step 2: Format the payload
    const formattedPayload = formatPayload(payload);

    // Step 3: Execute the workflow
    const workflowResult = await executeWorkflow({
      tenantId,
      workflowId,
      payload: formattedPayload,
    });

    console.log('✅ Agent tool execution completed successfully');

    return {
      success: true,
      workflowId,
      executionId: workflowResult.executionId,
      message: workflowResult.message || 'Tool executed successfully',
      data: workflowResult.data,
    };
  } catch (error: any) {
    console.error('❌ Agent tool execution failed:', error);

    return {
      success: false,
      workflowId: '', // Not available if findWorkflowId fails
      message: 'Tool execution failed',
      error: error.message || 'Unknown error occurred',
    };
  }
};
