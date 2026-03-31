import { getFirestore } from 'firebase-admin/firestore';
import { validate11LabsToolName } from '../../utils/validate11LabsToolName';

export interface Update11LabsToolInput {
  tenantId: string;
  agentId: string;
  toolId: string;
  name: string;
  description: string;
}

/**
 * Updates a tool definition in 11Labs workspace
 * Syncs local changes (name/description) to 11Labs
 */
export const update11LabsTool = async (input: Update11LabsToolInput): Promise<void> => {
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

  // Get elevenLabsToolId from 11labs/config
  const configDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('agents')
    .doc(agentId)
    .collection('agentTools')
    .doc(toolId)
    .collection('11labs')
    .doc('config')
    .get();

  if (!configDoc.exists) {
    throw new Error(`11Labs config not found for tool: ${toolId}. Tool may not be synced to 11Labs.`);
  }

  const configData = configDoc.data();
  const elevenLabsToolId = configData?.elevenLabsToolId;

  if (!elevenLabsToolId) {
    throw new Error(`elevenLabsToolId not found in config for tool: ${toolId}`);
  }

  console.log(`🔄 Updating 11Labs tool: ${elevenLabsToolId}`);

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

  // Build webhook URL
  const webhookUrl = `${apiBaseUrl}/api/agent-tools/execute`;

  // Build update payload (full tool_config required by 11Labs PATCH)
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

  // Update tool in 11Labs
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/tools/${elevenLabsToolId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('11Labs tool update failed:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to update 11Labs tool: ${response.status} ${response.statusText} - ${errorText}`);
  }

  console.log(` Updated 11Labs tool: ${elevenLabsToolId}`);
};
