import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { get11LabsAgentConfig } from '../../../services/refreshAgent/get11LabsAgentConfig';

export interface AssignToolToAgentInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  elevenLabsAgentId: string;
  elevenLabsToolId: string;
}

/**
 * Assigns a tool to a specific 11Labs agent
 * Updates agent configuration to include the tool in tool_ids array
 * Updates Firestore config with connection status
 */
export const assignToolToAgent = async (input: AssignToolToAgentInput): Promise<void> => {
  const { tenantId, agentId, toolId, elevenLabsAgentId, elevenLabsToolId } = input;
  const db = getFirestore();

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log(`🔧 Connecting tool ${elevenLabsToolId} to agent ${elevenLabsAgentId}`);

  // Get current agent config from 11Labs
  const currentConfig = await get11LabsAgentConfig(elevenLabsAgentId);

  // Get existing tool_ids or initialize empty array
  const existingToolIds = currentConfig.conversation_config?.agent?.prompt?.tool_ids || [];

  // Check if tool is already connected
  if (existingToolIds.includes(elevenLabsToolId)) {
    console.log(`⚠️ Tool ${elevenLabsToolId} is already connected to agent ${elevenLabsAgentId}`);
    return;
  }

  // Add new tool to the list
  const updatedToolIds = [...existingToolIds, elevenLabsToolId];

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

  console.log(`📦 Updating agent with tool_ids:`, updatedToolIds);

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

  console.log(`✅ Connected tool ${elevenLabsToolId} to agent ${elevenLabsAgentId}`);

  // Update Firestore config with connection status
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
      isConnectedToAgent: true,
      connectedAgentId: elevenLabsAgentId,
      updatedAt: timestamp,
    });

  console.log(`✅ Updated Firestore config: tool ${toolId} connected to agent ${elevenLabsAgentId}`);
};
