import { firestore } from '../../../config/firebase';

/**
 * Service for managing internal system prompts that are stored separately from 11Labs
 * These prompts are injected into phone calls via dynamic variables
 */

export interface SystemPromptData {
  prompt: string;
  lastUpdated: Date;
  updatedBy?: string;
}

export class SystemPromptService {
  /**
   * Get the internal system prompt for an agent
   */
  async getSystemPrompt(tenantId: string, agentId: string): Promise<string> {
    try {
      const promptRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('internal').doc('systemPrompt');

      const promptDoc = await promptRef.get();

      if (promptDoc.exists) {
        const data = promptDoc.data() as SystemPromptData;
        return data.prompt || '';
      }

      // Fallback to legacy prompt storage if no internal prompt exists
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);
      
      const agentDoc = await agentRef.get();
      if (agentDoc.exists) {
        const agentData = agentDoc.data();
        return agentData?.prompt || agentData?.conversation?.agent?.prompt?.prompt || '';
      }

      return '';
    } catch (error) {
      console.error('Error fetching system prompt:', error);
      return '';
    }
  }

  /**
   * Update the internal system prompt for an agent
   */
  async updateSystemPrompt(
    tenantId: string, 
    agentId: string, 
    prompt: string,
    updatedBy?: string
  ): Promise<void> {
    try {
      const promptRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('internal').doc('systemPrompt');

      const systemPromptData: SystemPromptData = {
        prompt,
        lastUpdated: new Date(),
        updatedBy
      };

      await promptRef.set(systemPromptData, { merge: true });
      
      console.log(`✅ Updated system prompt for agent ${agentId}`);
    } catch (error) {
      console.error('Error updating system prompt:', error);
      throw new Error(`Failed to update system prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Migrate existing prompt to internal storage (one-time migration helper)
   */
  async migrateExistingPrompt(tenantId: string, agentId: string): Promise<void> {
    try {
      // Get existing prompt from agent document
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);
      
      const agentDoc = await agentRef.get();
      if (agentDoc.exists) {
        const agentData = agentDoc.data();
        const existingPrompt = agentData?.prompt || agentData?.conversation?.agent?.prompt?.prompt;
        
        if (existingPrompt) {
          await this.updateSystemPrompt(tenantId, agentId, existingPrompt, 'migration');
          console.log(`📦 Migrated existing prompt for agent ${agentId}`);
        }
      }
    } catch (error) {
      console.error('Error migrating existing prompt:', error);
      throw new Error(`Failed to migrate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if agent has an internal system prompt
   */
  async hasInternalPrompt(tenantId: string, agentId: string): Promise<boolean> {
    try {
      const promptRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId)
        .collection('internal').doc('systemPrompt');

      const promptDoc = await promptRef.get();
      return promptDoc.exists;
    } catch (error) {
      console.error('Error checking internal prompt existence:', error);
      return false;
    }
  }
}

export const systemPromptService = new SystemPromptService();