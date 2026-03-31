import { v4 as uuidv4 } from 'uuid';
import { firestore } from '../../../../config/firebase';

interface ActionUnderstanding {
  summary: string;
  behavior: string;
  tone: string;
  keyPoints: string[];
  confidence: number;
  missingContext?: string[];
}

interface PostActionWebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      apiKey?: string;
      apiKeyHeader?: string;
    };
  };
}

interface PostActionPayloadMapping {
  includeAgentResponse: boolean;
  includeUserInput: boolean;
  includeTimestamp: boolean;
  includeSessionId: boolean;
  includeAgentId: boolean;
  includeActionId: boolean;
  includeCustomData: boolean;
  customDataFields?: Record<string, any>;
}

interface PostActionConfiguration {
  webhook: PostActionWebhookConfig;
  payloadMapping: PostActionPayloadMapping;
  responseHandling: {
    expectResponse: boolean;
    timeoutMs: number;
    retryOnFailure: boolean;
    maxRetries: number;
  };
  conditions?: {
    onlyOnSuccess?: boolean;
    onlyOnKeywords?: string[];
    onlyOnIntentMatch?: string[];
  };
}

interface CreateActionParams {
  agentId: string;
  tenantId: string;
  userId: string;
  name: string;
  description: string;
  type: 'nurture' | 'support' | 'followup' | 'custom';
  prompt: string;
  understanding: ActionUnderstanding;
  postActionConfig?: PostActionConfiguration;
  isActive?: boolean;
}

interface ActionResult {
  actionId: string;
  agentId: string;
  name: string;
  description: string;
  type: string;
  prompt: string;
  understanding: ActionUnderstanding;
  postActionConfig?: PostActionConfiguration;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const createNewActionService = async (params: CreateActionParams): Promise<ActionResult> => {
  try {
    const {
      agentId,
      tenantId,
      userId,
      name,
      description,
      type,
      prompt,
      understanding,
      postActionConfig,
      isActive = true
    } = params;

    // Generate unique action ID
    const actionId = uuidv4();
    const timestamp = new Date().toISOString();

    // Verify agent exists
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId);

    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error('Agent not found');
    }

    // Create action document in Firestore
    const actionData = {
      actionId,
      agentId,
      tenantId,
      createdBy: userId,
      name,
      description,
      type,
      prompt,
      understanding,
      postActionConfig: postActionConfig || null,
      isActive,
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
      usageCount: 0,
      lastUsed: null
    };

    // Save to Firestore under the agent's actions subcollection
    const actionRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId)
      .collection('actions')
      .doc(actionId);

    await actionRef.set(actionData);

    // Also save to a global actions collection for easier querying
    const globalActionRef = firestore
      .collection('actions')
      .doc(actionId);

    await globalActionRef.set({
      ...actionData,
      agentPath: `tenants/${tenantId}/agents/${agentId}`,
      searchableText: `${name} ${description} ${type}`.toLowerCase()
    });

    console.log(` Action created successfully: ${actionId} for agent ${agentId}`);

    return {
      actionId,
      agentId,
      name,
      description,
      type,
      prompt,
      understanding,
      postActionConfig,
      isActive,
      createdAt: timestamp,
      updatedAt: timestamp
    };

  } catch (error) {
    console.error('L Error creating action:', error);
    throw new Error(`Failed to create action: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};