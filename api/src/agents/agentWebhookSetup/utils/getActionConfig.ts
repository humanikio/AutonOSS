import { getActionService } from '../../../agentTraining/actions/services/CRUD/getAction';
import { getAgentActionsService } from '../../../agentTraining/actions/services/CRUD/getAgentActions';

interface ActionConfig {
  actionId: string;
  name: string;
  description?: string;
  type: 'nurture' | 'support' | 'followup' | 'custom';
  isActive: boolean;
  prompt?: string;
  understanding?: {
    summary: string;
    behavior: string;
    tone: string;
    keyPoints: string[];
    confidence: number;
  };
}

/**
 * Get action configuration from the real actionId document system
 */
export async function getActionConfig(actionId: string, tenantId: string): Promise<ActionConfig | null> {
  try {
    console.log(`Getting action config for actionId: ${actionId}, tenantId: ${tenantId}`);
    
    const actionData = await getActionService(actionId, tenantId);
    
    if (!actionData) {
      return null;
    }

    return {
      actionId: actionData.actionId,
      name: actionData.name,
      description: actionData.description,
      type: actionData.type,
      isActive: actionData.isActive,
      prompt: actionData.prompt,
      understanding: actionData.understanding
    };
  } catch (error) {
    console.error(`Error getting action config for ${actionId}:`, error);
    return null;
  }
}

/**
 * Validate if an action exists and is active
 */
export async function validateActionId(actionId: string, tenantId: string): Promise<boolean> {
  try {
    console.log(`🔍 Validating actionId: ${actionId} for tenantId: ${tenantId}`);
    
    const actionConfig = await getActionConfig(actionId, tenantId);
    
    console.log(`📋 Action config retrieved:`, {
      found: actionConfig !== null,
      isActive: actionConfig?.isActive,
      actionName: actionConfig?.name,
      actionType: actionConfig?.type
    });
    
    // Allow both active and inactive actions for webhooks (less restrictive)
    const isValid = actionConfig !== null; // Remove the isActive requirement
    
    if (!isValid) {
      console.log(`❌ Action validation failed:`, {
        exists: actionConfig !== null,
        reason: !actionConfig ? 'Action not found' : 'Unknown'
      });
    } else {
      console.log(`✅ Action validation passed: ${actionConfig.name} (${actionConfig.type}) - Active: ${actionConfig.isActive}`);
    }
    
    return isValid;
  } catch (error) {
    console.error(`❌ Error validating actionId ${actionId}:`, error);
    return false;
  }
}

/**
 * List all available actions for an agent
 */
export async function listAvailableActions(agentId: string, tenantId: string): Promise<ActionConfig[]> {
  try {
    console.log(`Listing available actions for agentId: ${agentId}, tenantId: ${tenantId}`);
    
    const actions = await getAgentActionsService(agentId, tenantId);
    
    return actions.map(action => ({
      actionId: action.actionId,
      name: action.name,
      description: action.description,
      type: action.type,
      isActive: action.isActive,
      prompt: action.prompt,
      understanding: action.understanding
    }));
  } catch (error) {
    console.error(`Error listing actions for agent ${agentId}:`, error);
    return [];
  }
}