import { firestore } from '../../../config/firebase';

export interface ActionContextData {
  actionId: string;
  agentId: string;
  tenantId: string;
  currentAction?: {
    name: string;
    description: string;
    prompt: string;
    understanding: any;
    isActive: boolean;
    promptVersion: number;
  };
  agentInfo?: {
    name: string;
    personality?: string;
    instructions?: string;
  };
  existingActions?: Array<{
    actionId: string;
    name: string;
    description: string;
    prompt: string;
  }>;
}

export class ActionContext {
  private tenantId: string;
  private agentId: string;
  private actionId: string;

  constructor(tenantId: string, agentId: string, actionId: string) {
    this.tenantId = tenantId;
    this.agentId = agentId;
    // Handle "new" actions by generating a proper ID
    this.actionId = actionId === 'new' ? `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : actionId;
  }

  /**
   * Load complete context for action creation/editing
   */
  async loadContext(): Promise<ActionContextData> {
    try {
      const context: ActionContextData = {
        actionId: this.actionId,
        agentId: this.agentId,
        tenantId: this.tenantId
      };

      // Load current action if not "new"
      if (this.actionId !== 'new') {
        context.currentAction = await this.loadCurrentAction();
      }

      // Load agent information
      context.agentInfo = await this.loadAgentInfo();

      // Load existing actions for context
      context.existingActions = await this.loadExistingActions();

      return context;
    } catch (error) {
      console.error('Error loading action context:', error);
      throw new Error(`Failed to load context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load the current action being edited
   */
  private async loadCurrentAction(): Promise<ActionContextData['currentAction']> {
    try {
      const actionRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions')
        .doc(this.actionId);

      const actionDoc = await actionRef.get();
      if (!actionDoc.exists) {
        return undefined;
      }

      const actionData = actionDoc.data();
      return {
        name: actionData?.name || '',
        description: actionData?.description || '',
        prompt: actionData?.prompt || '',
        understanding: actionData?.understanding || {},
        isActive: actionData?.isActive || false,
        promptVersion: actionData?.promptVersion || 1
      };
    } catch (error) {
      console.error('Error loading current action:', error);
      return undefined;
    }
  }

  /**
   * Load agent information for context
   */
  private async loadAgentInfo(): Promise<ActionContextData['agentInfo']> {
    try {
      const agentRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId);

      const agentDoc = await agentRef.get();
      if (!agentDoc.exists) {
        return undefined;
      }

      const agentData = agentDoc.data();
      return {
        name: agentData?.name || 'Agent',
        personality: agentData?.personality || '',
        instructions: agentData?.instructions || ''
      };
    } catch (error) {
      console.error('Error loading agent info:', error);
      return undefined;
    }
  }

  /**
   * Load existing actions for consistency context
   */
  private async loadExistingActions(): Promise<ActionContextData['existingActions']> {
    try {
      const actionsRef = firestore
        .collection('tenants')
        .doc(this.tenantId)
        .collection('agents')
        .doc(this.agentId)
        .collection('actions');

      const snapshot = await actionsRef.limit(10).get();

      return snapshot.docs
        .filter(doc => doc.id !== this.actionId) // Exclude current action
        .map(doc => {
          const data = doc.data();
          return {
            actionId: doc.id,
            name: data.name || '',
            description: data.description || '',
            prompt: data.prompt || ''
          };
        });
    } catch (error) {
      console.error('Error loading existing actions:', error);
      return [];
    }
  }

  /**
   * Format context for AI prompt inclusion
   */
  formatForPrompt(context: ActionContextData): string {
    let contextText = `Action Creation Context:\n\n`;

    // Current action context
    if (context.currentAction) {
      contextText += `Current Action Being Edited:\n`;
      contextText += `- Name: ${context.currentAction.name}\n`;
      contextText += `- Description: ${context.currentAction.description}\n`;
      contextText += `- Current Prompt: "${context.currentAction.prompt}"\n`;
      contextText += `- Version: ${context.currentAction.promptVersion}\n`;
      contextText += `- Status: ${context.currentAction.isActive ? 'Active' : 'Inactive'}\n\n`;
    } else {
      contextText += `Creating New Action\n\n`;
    }

    // Agent context
    if (context.agentInfo) {
      contextText += `Agent Context:\n`;
      contextText += `- Agent Name: ${context.agentInfo.name}\n`;
      if (context.agentInfo.personality) {
        contextText += `- Personality: ${context.agentInfo.personality}\n`;
      }
      if (context.agentInfo.instructions) {
        contextText += `- Instructions: ${context.agentInfo.instructions}\n`;
      }
      contextText += `\n`;
    }

    // Existing actions for consistency
    if (context.existingActions && context.existingActions.length > 0) {
      contextText += `Existing Actions (for consistency):\n`;
      context.existingActions.forEach(action => {
        contextText += `- ${action.name}: ${action.description}\n`;
      });
      contextText += `\n`;
    }

    contextText += `Remember to maintain consistency with the agent's personality and existing actions when creating or modifying prompts.\n`;

    return contextText;
  }
}