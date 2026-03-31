import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validate11LabsToolName } from '../../utils/validate11LabsToolName';
import { getAgentElevenLabsId } from './getAgentElevenLabsId';
import { assignToolToAgent } from './assignToolToAgent';

export interface Create11LabsToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  name: string;
  description: string;
}

export interface ElevenLabsToolConfig {
  elevenLabsToolId: string;
  isConnectedToAgent: boolean;
  connectedAgentId: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface ElevenLabsToolResponse {
  id: string;
  tool_config: {
    type: string;
    name: string;
    description: string;
  };
}

/**
 * Creates a webhook tool in 11Labs workspace
 * Saves tool metadata to Firestore at toolId/11labs/config
 * Automatically assigns tool to agent
 */
export const create11LabsTool = async (input: Create11LabsToolInput): Promise<string> => {
  const { tenantId, agentId, toolId, name, description } = input;
  const db = getFirestore();

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const autonToolsApiKey = process.env.ELEVENLABS_AGENT_TOOLS_API_KEY;
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  if (!autonToolsApiKey) {
    throw new Error('ELEVENLABS_AGENT_TOOLS_API_KEY environment variable is not set');
  }

  // Validate and sanitize tool name for 11Labs
  const nameValidation = validate11LabsToolName(name);
  if (!nameValidation.isValid) {
    console.error(`❌ Invalid tool name for 11Labs: ${nameValidation.error}`);
    throw new Error(nameValidation.error || 'Invalid tool name for 11Labs');
  }

  const sanitizedName = nameValidation.sanitized;
  if (sanitizedName !== name) {
    console.warn(`⚠️  Tool name sanitized: "${name}" → "${sanitizedName}"`);
  }

  // Build webhook URL for tool execution
  const webhookUrl = `${apiBaseUrl}/api/agent-tools/execute`;

  // Build 11Labs webhook tool config
  const toolConfig = {
    tool_config: {
      type: 'webhook',
      name: sanitizedName,
      description,
      api_schema: {
        url: webhookUrl,
        method: 'POST',
        request_headers: {
          'Authorization': `Bearer ${autonToolsApiKey}`,
          'X-Tenant-Id': tenantId,
          'X-Agent-Id': agentId,
          'X-Tool-Id': toolId,
        },
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  };

  console.log(`🔧 Creating 11Labs tool: ${sanitizedName} for toolId: ${toolId}`);

  // Create tool in 11Labs workspace
  const response = await fetch('https://api.elevenlabs.io/v1/convai/tools', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('11Labs tool creation failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to create 11Labs tool: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const toolResponse = (await response.json()) as ElevenLabsToolResponse;
  const elevenLabsToolId = toolResponse.id;

  console.log(`✅ Created 11Labs tool: ${elevenLabsToolId}`);

  // Save tool metadata to Firestore
  const timestamp = FieldValue.serverTimestamp();
  const configData: Omit<ElevenLabsToolConfig, 'createdAt' | 'updatedAt'> & {
    createdAt: FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.FieldValue;
  } = {
    elevenLabsToolId,
    isConnectedToAgent: false,
    connectedAgentId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .collection('11labs')
    .doc('config')
    .set(configData);

  console.log(`✅ Saved 11Labs tool config to Firestore: toolId/${toolId}/11labs/config`);

  // Automatically assign tool to agent
  console.log(`🔗 [CREATE 11LABS TOOL] Attempting to auto-assign tool to agent`);
  try {
    const elevenLabsAgentId = await getAgentElevenLabsId(tenantId, agentId);

    if (elevenLabsAgentId) {
      console.log(`📍 [CREATE 11LABS TOOL] Found 11Labs agent ID: ${elevenLabsAgentId}`);
      await assignToolToAgent({
        tenantId,
        agentId,
        toolId,
        elevenLabsAgentId,
        elevenLabsToolId,
      });
      console.log(`✅ [CREATE 11LABS TOOL] Tool successfully assigned to agent`);
    } else {
      console.warn(`⚠️  [CREATE 11LABS TOOL] Agent does not have elevenLabsAgentId - tool created but not assigned`);
    }
  } catch (error: any) {
    console.error(`❌ [CREATE 11LABS TOOL] Failed to assign tool to agent:`, error.message);
    console.warn(`⚠️  [CREATE 11LABS TOOL] Tool created in 11Labs but not assigned to agent`);
    // Don't throw - tool creation succeeded
  }

  return elevenLabsToolId;
};
