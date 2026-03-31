import { Request, Response } from 'express';
import { executeAgentTool } from '../../agents/agentManagement/agentTools/services/agentToolExecutor';

/**
 * Handle inbound agent tool execution from 11Labs
 * POST /api/agent-tools/execute
 *
 * Headers (validated by middleware):
 * - Authorization: Bearer <ELEVENLABS_AGENT_TOOLS_API_KEY>
 * - X-Tenant-Id: {tenantId}
 * - X-Agent-Id: {agentId}
 * - X-Tool-Id: {toolId}
 *
 * Body: User-provided parameters from 11Labs
 */
export const executeAgentToolController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract routing info from request (set by middleware)
    // Middleware guarantees these exist, but we check defensively
    const tenantId = req.tenantId;
    const agentId = req.agentId;
    const toolId = req.toolId;

    if (!tenantId || !agentId || !toolId) {
      res.status(400).json({
        success: false,
        workflowId: '',
        message: 'Missing required routing information',
        error: 'tenantId, agentId, and toolId are required',
      });
      return;
    }

    // Extract payload from request body
    const payload = req.body;

    console.log('🔧 Agent tool execution request received:', {
      tenantId,
      agentId,
      toolId,
    });

    // Execute the agent tool
    const result = await executeAgentTool({
      tenantId,
      agentId,
      toolId,
      payload,
    });

    // Return result
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error: any) {
    console.error('❌ Error in agent tool controller:', error);
    res.status(500).json({
      success: false,
      workflowId: '',
      message: 'Failed to execute agent tool',
      error: error.message || 'Unknown error occurred',
    });
  }
};
