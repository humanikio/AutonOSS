import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { get11LabsAgentConfig } from '../../../services/refreshAgent/get11LabsAgentConfig';

export interface UnassignToolFromAgentInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  elevenLabsAgentId: string;
  elevenLabsToolId: string;
}

/**
 * Removes a tool from a specific 11Labs agent
 * Updates agent configuration to remove the tool from tool_ids array
 * Updates Firestore config with disconnection status
 */
export const unassignToolFromAgent = async (input: UnassignToolFromAgentInput): Promise<void> => {
  const { tenantId, agentId, toolId, elevenLabsAgentId, elevenLabsToolId } = input;
  const db = getFirestore();

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log(`🔌 [UNASSIGN TOOL] Disconnecting tool ${elevenLabsToolId} from agent ${elevenLabsAgentId}`);

  // Get current agent config from 11Labs
  const currentConfig = await get11LabsAgentConfig(elevenLabsAgentId);

  // Get existing tool_ids or initialize empty array
  const existingToolIds = currentConfig.conversation_config?.agent?.prompt?.tool_ids || [];

  // Check if tool is connected
  if (!existingToolIds.includes(elevenLabsToolId)) {
    console.log(`⚠️  [UNASSIGN TOOL] Tool ${elevenLabsToolId} is not connected to agent ${elevenLabsAgentId}`);
    return;
  }

  // Remove tool from the list
  const updatedToolIds = existingToolIds.filter((id: string) => id !== elevenLabsToolId);

  // Build update payload
  const updatePayload = {
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: updatedToolIds
        }
      }
    }
  };

  console.log(`📦 [UNASSIGN TOOL] Updating agent tool_ids (removing ${elevenLabsToolId})`);

  // Update agent in 11Labs
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updatePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('11Labs agent update failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to update 11Labs agent: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(`✅ [UNASSIGN TOOL] Disconnected tool ${elevenLabsToolId} from agent ${elevenLabsAgentId}`);

  // Update Firestore config with disconnection status
  const timestamp = FieldValue.serverTimestamp();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .collection('11labs')
    .doc('config')
    .update({
      isConnectedToAgent: false,
      connectedAgentId: null,
      updatedAt: timestamp,
    });

  console.log(`✅ [UNASSIGN TOOL] Updated Firestore config: tool ${toolId} disconnected from agent`);
};
