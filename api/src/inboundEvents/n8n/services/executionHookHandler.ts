import { getWorkflowMapping } from '../../../n8n/services/workflowMapping/getMapping';
import { createWaitSubscription } from '../../../workflows/triggerSubscriptions/services/waitSubscriptionManager';

export interface ExecutionHookInput {
  tenantId: string;
  executionId: string;
  resumeUrl: string;
  workflowId: string;       // n8n workflow ID
  milestone?: string;
  eventId?: string;
  nodeId?: string;          // ReactFlow node ID
}

export class ExecutionHookHandler {
  /**
   * Process execution hook from n8n
   *
   * Flow:
   * 1. Lookup internal workflowId from n8nWorkflowId mapping
   * 2. Verify tenantId matches (security check)
   * 3. Create wait subscription with resumeUrl for later resume
   */
  async handleHook(input: ExecutionHookInput): Promise<void> {
    const { tenantId, executionId, workflowId: n8nWorkflowId, milestone, eventId, nodeId } = input;
    let { resumeUrl } = input;

    console.log('🔍 Resolving n8n workflow mapping...');

    // Override localhost resumeUrl with production N8N_API_URL
    // This handles cases where n8n's $execution.resumeUrl returns localhost
    const N8N_API_URL = process.env.N8N_API_URL;
    if (N8N_API_URL && resumeUrl.includes('localhost')) {
      const executionPath = resumeUrl.split('localhost:5678')[1] || `/webhook-waiting/${executionId}`;
      resumeUrl = `${N8N_API_URL}${executionPath}`;
      console.log(`🔄 Overrode localhost resumeUrl: ${resumeUrl}`);
    }

    // Get mapping
    const mapping = await getWorkflowMapping(n8nWorkflowId);

    if (!mapping) {
      throw new Error(`No mapping found for n8n workflow ${n8nWorkflowId}`);
    }

    // Security check: verify tenantId matches
    if (mapping.tenantId !== tenantId) {
      throw new Error(
        `TenantId mismatch: API key tenant ${tenantId} != workflow tenant ${mapping.tenantId}`
      );
    }

    console.log(`✅ Mapped to internal workflow: ${mapping.workflowId}`);

    // Create wait subscription (milestone and nodeId required, eventId optional)
    if (milestone && nodeId) {
      await createWaitSubscription({
        tenantId,
        workflowId: mapping.workflowId,
        n8nWorkflowId,
        executionId,
        resumeUrl,
        nodeId,
        value: milestone,  // Use milestone as the wait value
        eventId: eventId   // Optional - will be used for filtering if provided
      });

      console.log('✅ Wait subscription created');
    } else {
      console.log('ℹ️  Skipping wait subscription (missing milestone or nodeId)');
      console.log(`   Milestone: ${milestone || 'MISSING'}`);
      console.log(`   NodeId: ${nodeId || 'MISSING'}`);
      console.log(`   EventId: ${eventId || 'not provided (optional)'}`);
    }
  }
}

export const executionHookHandler = new ExecutionHookHandler();
