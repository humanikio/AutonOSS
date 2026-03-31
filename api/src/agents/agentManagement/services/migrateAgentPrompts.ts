import { systemPromptService } from './systemPromptService';
import { firestore } from '../../../config/firebase';

/**
 * Migration utility to move existing prompts from 11Labs/Firestore to internal storage
 * This ensures existing agents work with the new dynamic variable system
 */

export interface MigrationResult {
  success: boolean;
  agentId: string;
  promptMigrated: boolean;
  promptLength: number;
  error?: string;
}

export class AgentPromptMigration {
  /**
   * Migrate a single agent's prompt to internal storage
   */
  async migrateAgentPrompt(tenantId: string, agentId: string): Promise<MigrationResult> {
    try {
      console.log(`🔄 Starting prompt migration for agent: ${agentId}`);

      // Check if already migrated
      const hasInternal = await systemPromptService.hasInternalPrompt(tenantId, agentId);
      if (hasInternal) {
        console.log(`✅ Agent ${agentId} already has internal prompt, skipping`);
        return {
          success: true,
          agentId,
          promptMigrated: false,
          promptLength: 0
        };
      }

      // Get existing prompt from Firestore agent document
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);
      
      const agentDoc = await agentRef.get();
      if (!agentDoc.exists) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const agentData = agentDoc.data();
      const existingPrompt = agentData?.prompt || 
                           agentData?.conversation?.agent?.prompt?.prompt ||
                           agentData?.systemPrompt;

      if (!existingPrompt) {
        console.warn(`⚠️ No existing prompt found for agent ${agentId}`);
        return {
          success: true,
          agentId,
          promptMigrated: false,
          promptLength: 0
        };
      }

      // Migrate to internal storage
      await systemPromptService.updateSystemPrompt(
        tenantId, 
        agentId, 
        existingPrompt, 
        'migration'
      );

      console.log(`✅ Migrated prompt for agent ${agentId} (${existingPrompt.length} characters)`);

      return {
        success: true,
        agentId,
        promptMigrated: true,
        promptLength: existingPrompt.length
      };

    } catch (error) {
      console.error(`❌ Error migrating agent ${agentId}:`, error);
      return {
        success: false,
        agentId,
        promptMigrated: false,
        promptLength: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Migrate all agents in a tenant
   */
  async migrateTenantPrompts(tenantId: string): Promise<MigrationResult[]> {
    try {
      console.log(`🔄 Starting bulk prompt migration for tenant: ${tenantId}`);

      // Get all agents for the tenant
      const agentsRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents');
      
      const snapshot = await agentsRef.get();
      
      if (snapshot.empty) {
        console.log(`ℹ️ No agents found for tenant ${tenantId}`);
        return [];
      }

      const results: MigrationResult[] = [];
      const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log(`📊 Found ${agents.length} agents to migrate`);

      // Migrate each agent sequentially to avoid overwhelming Firestore
      for (const agent of agents) {
        const result = await this.migrateAgentPrompt(tenantId, agent.id);
        results.push(result);
        
        // Small delay between migrations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const successful = results.filter(r => r.success).length;
      const migrated = results.filter(r => r.promptMigrated).length;
      const errors = results.filter(r => !r.success).length;

      console.log(`✅ Migration complete for tenant ${tenantId}:`);
      console.log(`  - Total agents: ${agents.length}`);
      console.log(`  - Successful: ${successful}`);
      console.log(`  - Prompts migrated: ${migrated}`);
      console.log(`  - Errors: ${errors}`);

      return results;

    } catch (error) {
      console.error(`❌ Error migrating tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get migration status for an agent
   */
  async getAgentMigrationStatus(tenantId: string, agentId: string): Promise<{
    hasInternalPrompt: boolean;
    hasLegacyPrompt: boolean;
    promptLength: number;
    needsMigration: boolean;
  }> {
    try {
      // Check internal prompt
      const hasInternal = await systemPromptService.hasInternalPrompt(tenantId, agentId);
      const internalPrompt = hasInternal ? await systemPromptService.getSystemPrompt(tenantId, agentId) : '';

      // Check legacy prompt
      const agentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('agents').doc(agentId);
      
      const agentDoc = await agentRef.get();
      const legacyPrompt = agentDoc.exists ? 
        (agentDoc.data()?.prompt || agentDoc.data()?.conversation?.agent?.prompt?.prompt || '') : '';

      return {
        hasInternalPrompt: hasInternal,
        hasLegacyPrompt: !!legacyPrompt,
        promptLength: internalPrompt.length || legacyPrompt.length,
        needsMigration: !hasInternal && !!legacyPrompt
      };

    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        hasInternalPrompt: false,
        hasLegacyPrompt: false,
        promptLength: 0,
        needsMigration: false
      };
    }
  }
}

export const agentPromptMigration = new AgentPromptMigration();