import { firestore } from '../../../config/firebase';

/**
 * Action prompt service for fetching and managing action-specific prompts
 * Used to integrate trained action behaviors into SMS conversations
 */

export interface ActionData {
  actionId: string;
  name: string;
  description: string;
  prompt: string;
  type: 'nurture' | 'support' | 'followup' | 'custom';
  isActive: boolean;
  understanding?: {
    summary: string;
    behavior: string;
    tone: string;
    keyPoints: string[];
    confidence: number;
  };
}

export interface ActionPromptRequest {
  actionId: string;
  tenantId: string;
  agentId: string;
}

export class ActionPromptService {
  /**
   * Fetch action data for SMS integration
   */
  async getActionData(request: ActionPromptRequest): Promise<ActionData | null> {
    try {
      console.log(`🎯 Fetching action data for: ${request.actionId}`);
      console.log(`📍 Using correct nested collection path: tenants/${request.tenantId}/agents/${request.agentId}/actions/${request.actionId}`);

      // Get action from the correct nested collection path
      const actionRef = firestore
        .collection('tenants').doc(request.tenantId)
        .collection('agents').doc(request.agentId)
        .collection('actions').doc(request.actionId);

      const actionDoc = await actionRef.get();

      if (actionDoc.exists) {
        const actionData = actionDoc.data();
        
        // Check if action is active
        if (!actionData?.isActive) {
          console.warn(`⚠️ Action ${request.actionId} exists but is inactive`);
          return null;
        }

        console.log(`✅ Action data loaded: ${actionData?.name} (${actionData?.type})`);
        console.log(`📋 Action prompt length: ${actionData?.prompt?.length || 0} characters`);
        console.log(`🔍 Debug - Action data keys: ${Object.keys(actionData || {})}`);
        console.log(`🔍 Debug - Full prompt field: "${actionData?.prompt}"`);

        return {
          actionId: actionData?.actionId || request.actionId,
          name: actionData?.name || 'Unnamed Action',
          description: actionData?.description || 'No description available',
          prompt: actionData?.prompt || '',
          type: actionData?.type || 'custom',
          isActive: actionData?.isActive || false,
          understanding: actionData?.understanding
        };
      }

      console.warn(`❌ Action not found in nested collection: ${request.actionId}`);
      return null;

    } catch (error) {
      console.error('Error fetching action data:', error);
      return null;
    }
  }

  /**
   * Check if action should be applied (validation helper)
   */
  validateActionData(actionData: ActionData | null): boolean {
    if (!actionData) {
      return false;
    }

    // Validate required fields
    if (!actionData.name || !actionData.prompt) {
      console.warn(`⚠️ Action ${actionData.actionId} missing required fields (name or prompt)`);
      return false;
    }

    // Check if action is active
    if (!actionData.isActive) {
      console.warn(`⚠️ Action ${actionData.actionId} is not active`);
      return false;
    }

    return true;
  }

  /**
   * Get action context summary for logging
   */
  getActionSummary(actionData: ActionData): string {
    return `Action: ${actionData.name} (${actionData.type}) - ${actionData.description}`;
  }

  /**
   * Determine if action prompt should influence RAG decisions
   */
  shouldInfluenceRAG(actionData: ActionData): boolean {
    // Actions that typically need knowledge base support
    const ragInfluencingTypes = ['support', 'nurture'];
    return ragInfluencingTypes.includes(actionData.type);
  }

  /**
   * Get action-specific guidance for response tone/style
   */
  getActionGuidance(actionData: ActionData): string {
    const baseGuidance = `This interaction is part of "${actionData.name}" - ${actionData.description}`;
    
    // Add type-specific guidance
    switch (actionData.type) {
      case 'nurture':
        return `${baseGuidance}\nApproach: Focus on building relationship and providing value while being helpful and consultative.`;
      
      case 'support':
        return `${baseGuidance}\nApproach: Prioritize problem-solving and clear, actionable assistance.`;
      
      case 'followup':
        return `${baseGuidance}\nApproach: Reference previous interactions and provide continuity in the relationship.`;
      
      case 'custom':
        return `${baseGuidance}\nApproach: Follow the specific guidance provided in the action prompt.`;
      
      default:
        return baseGuidance;
    }
  }
}

export const actionPromptService = new ActionPromptService();