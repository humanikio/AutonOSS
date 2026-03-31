import { Request, Response } from 'express';
import { executionHookHandler } from '../services/executionHookHandler';

/**
 * Payload from n8n HTTP Request node
 */
export interface N8nExecutionHookPayload {
  executionId: string;
  resumeUrl: string;
  workflowId: string;       // n8n workflow ID
  milestone?: string;       // Optional: from wait node config
  eventId?: string;         // Optional: from workflow data
  nodeId?: string;          // Optional: ReactFlow node ID
}

export class InboundN8nController {
  /**
   * Handle execution hook from n8n
   * Stores resumeUrl for later use when milestone occurs
   */
  async handleExecutionHook(req: Request, res: Response): Promise<void> {
    try {
      const payload: N8nExecutionHookPayload = req.body;
      const tenantId = req.tenantId!; // From authenticateEither middleware

      console.log('📡 N8n execution hook received:');
      console.log(`   Execution ID: ${payload.executionId}`);
      console.log(`   Workflow ID (n8n): ${payload.workflowId}`);
      console.log(`   Tenant ID: ${tenantId}`);
      console.log(`   Milestone: ${payload.milestone || 'NOT PROVIDED'}`);
      console.log(`   Event ID: ${payload.eventId || 'NOT PROVIDED'}`);
      console.log(`   Node ID: ${payload.nodeId || 'NOT PROVIDED'}`);
      console.log(`   Full payload:`, JSON.stringify(payload, null, 2));

      // Validate required fields
      if (!payload.executionId || !payload.resumeUrl || !payload.workflowId) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: executionId, resumeUrl, workflowId'
        });
        return;
      }

      // Process and store
      await executionHookHandler.handleHook({
        tenantId,
        ...payload
      });

      console.log('✅ Execution hook processed successfully');

      res.status(200).json({
        success: true,
        message: 'Execution hook processed'
      });

    } catch (error: any) {
      console.error('❌ Error processing execution hook:', error);

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

export const inboundN8nController = new InboundN8nController();
