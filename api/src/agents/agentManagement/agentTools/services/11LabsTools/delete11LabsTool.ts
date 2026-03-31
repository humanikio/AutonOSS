import { getFirestore } from 'firebase-admin/firestore';
import { unassignToolFromAgent } from './unassignToolFromAgent';

export interface Delete11LabsToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
}

/**
 * Deletes a tool from 11Labs workspace
 * 1. Unassigns tool from agent (if connected)
 * 2. Deletes tool from 11Labs
 * 3. Deletes the 11labs/config document
 */
export const delete11LabsTool = async (input: Delete11LabsToolInput): Promise<void> => {
  const { tenantId, agentId, toolId } = input;
  const db = getFirestore();

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log(`🗑️  [DELETE 11LABS TOOL] Starting deletion for tool: ${toolId}`);

  // Get elevenLabsToolId and connection info from 11labs/config
  const configRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .collection('11labs')
    .doc('config');

  const configDoc = await configRef.get();

  if (!configDoc.exists) {
    console.warn(`⚠️  [DELETE 11LABS TOOL] 11Labs config not found for tool: ${toolId}. Skipping 11Labs deletion.`);
    return;
  }

  const configData = configDoc.data();
  const elevenLabsToolId = configData?.elevenLabsToolId;
  const isConnectedToAgent = configData?.isConnectedToAgent;
  const connectedAgentId = configData?.connectedAgentId;

  if (!elevenLabsToolId) {
    console.warn(`⚠️  [DELETE 11LABS TOOL] elevenLabsToolId not found in config for tool: ${toolId}. Skipping 11Labs deletion.`);
    await configRef.delete();
    return;
  }

  console.log(`📋 [DELETE 11LABS TOOL] Tool info:`, {
    elevenLabsToolId,
    isConnectedToAgent: !!isConnectedToAgent,
    connectedAgentId: connectedAgentId || 'N/A',
  });

  // Step 1: Unassign from agent if connected
  if (isConnectedToAgent && connectedAgentId) {
    console.log(`🔌 [DELETE 11LABS TOOL] Tool is connected to agent - unassigning first`);
    try {
      await unassignToolFromAgent({
        tenantId,
        agentId,
        toolId,
        elevenLabsAgentId: connectedAgentId,
        elevenLabsToolId,
      });
      console.log(`✅ [DELETE 11LABS TOOL] Successfully unassigned tool from agent`);
    } catch (error: any) {
      console.error(`❌ [DELETE 11LABS TOOL] Failed to unassign tool from agent:`, error.message);
      console.warn(`⚠️  [DELETE 11LABS TOOL] Continuing with tool deletion despite unassignment failure`);
      // Continue with deletion even if unassignment fails
    }
  } else {
    console.log(`⏭️  [DELETE 11LABS TOOL] Tool not connected to agent - skipping unassignment`);
  }

  // Step 2: Delete tool from 11Labs
  console.log(`🗑️  [DELETE 11LABS TOOL] Deleting tool from 11Labs: ${elevenLabsToolId}`);
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${elevenLabsToolId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [DELETE 11LABS TOOL] 11Labs tool deletion failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to delete 11Labs tool: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ [DELETE 11LABS TOOL] Deleted 11Labs tool: ${elevenLabsToolId}`);

  // Step 3: Delete 11labs/config document
  await configRef.delete();
  console.log(`✅ [DELETE 11LABS TOOL] Deleted 11labs/config for tool: ${toolId}`);
  console.log(`🎉 [DELETE 11LABS TOOL] Tool deletion completed: ${toolId}`);
};
