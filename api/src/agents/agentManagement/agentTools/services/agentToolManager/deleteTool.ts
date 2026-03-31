import { getFirestore } from 'firebase-admin/firestore';
import { delete11LabsTool } from '../11LabsTools/delete11LabsTool';
import { refreshAgent } from '../../../services/refreshAgent';

export interface DeleteToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
}

/**
 * Deletes an agent tool
 * 1. Deletes tool from 11Labs workspace (if synced - includes unassignment)
 * 2. Deletes tool document from Firestore
 * 3. Refreshes agent to sync updated tool_ids from 11Labs
 */
export const deleteTool = async (input: DeleteToolInput): Promise<void> => {
  const { tenantId, agentId, toolId } = input;
  const db = getFirestore();

  console.log(`🗑️  [DELETE TOOL] Deleting tool: ${toolId} for agent: ${agentId}`);

  // Step 1: Delete from 11Labs (if synced)
  try {
    await delete11LabsTool({ tenantId, agentId, toolId });
  } catch (error) {
    console.warn('⚠️  [DELETE TOOL] Failed to delete from 11Labs (may not be synced):', error);
    // Continue with local deletion even if 11Labs deletion fails
  }

  // Step 2: Delete tool document from Firestore
  const toolRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId);

  await toolRef.delete();

  console.log(`✅ [DELETE TOOL] Deleted tool: ${toolId} from Firestore`);

  // Step 3: Refresh agent to sync updated tool_ids from 11Labs
  try {
    // Get agent's elevenLabsAgentId
    const agentDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .get();

    const elevenLabsAgentId = agentDoc.data()?.elevenLabsAgentId;

    if (elevenLabsAgentId) {
      console.log(`🔄 [DELETE TOOL] Refreshing agent to sync tool_ids from 11Labs`);
      await refreshAgent({
        tenantId,
        agentId,
        elevenLabsAgentId,
      });
      console.log(`✅ [DELETE TOOL] Agent refreshed - toolIds synced from 11Labs`);
    } else {
      console.log(`⏭️  [DELETE TOOL] Agent has no elevenLabsAgentId - skipping refresh`);
    }
  } catch (error: any) {
    console.error(`❌ [DELETE TOOL] Failed to refresh agent after deletion:`, error.message);
    console.warn(`⚠️  [DELETE TOOL] Tool deleted but agent may show stale toolIds until next refresh`);
    // Don't throw - tool deletion succeeded
  }
};
