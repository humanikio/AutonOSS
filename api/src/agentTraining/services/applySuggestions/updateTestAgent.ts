import { firestore } from '../../../config/firebase';
import { CycleSuggestions } from './retrieveCycle';

/**
 * Service for updating test agent configuration with cycle suggestions
 * Handles selective application of prompt, setting, and knowledge base changes
 */

export interface UpdateTestAgentRequest {
  tenantId: string;
  sessionId: string;
  agentId: string;
  suggestions: CycleSuggestions;
  selectedSuggestions: {
    promptChanges?: boolean;
    settingChanges?: string[];
    knowledgeBaseChanges?: string[];
  };
}

export interface AppliedChanges {
  promptChanged: boolean;
  settingsChanged: string[];
  knowledgeBaseChanged: string[];
  previousValues: {
    systemPrompt?: string;
    settings?: any;
    knowledgeBase?: any;
  };
}

export interface UpdateTestAgentResult {
  success: boolean;
  appliedChanges?: AppliedChanges;
  updatedConfig?: any;
  changeLog?: string;
  error?: string;
}

export class UpdateTestAgentService {
  /**
   * Update test agent configuration with selected suggestions
   */
  async updateTestAgent(request: UpdateTestAgentRequest): Promise<UpdateTestAgentResult> {
    try {
      const { tenantId, sessionId, agentId, suggestions, selectedSuggestions } = request;
      
      console.log(`🔧 Updating test agent configuration`);
      console.log(`  - Session: ${sessionId}`);
      console.log(`  - Agent: ${agentId}`);
      console.log(`  - Selected suggestions:`, selectedSuggestions);

      // Get current test agent configuration
      const testAgentRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('trainingSessions').doc(sessionId)
        .collection('testAgent').doc(agentId);

      const testAgentSnapshot = await testAgentRef.get();

      if (!testAgentSnapshot.exists) {
        console.error(`❌ Test agent not found: ${agentId}`);
        return {
          success: false,
          error: `Test agent not found: ${agentId}`
        };
      }

      const currentConfig = testAgentSnapshot.data()!;
      console.log(`✅ Current test agent configuration loaded`);

      // Prepare update data and track changes
      const updateData: any = {};
      const appliedChanges: AppliedChanges = {
        promptChanged: false,
        settingsChanged: [],
        knowledgeBaseChanged: [],
        previousValues: {}
      };

      // Apply prompt changes
      if (selectedSuggestions.promptChanges && suggestions.promptChanges) {
        console.log(`📝 Applying prompt changes...`);
        appliedChanges.previousValues.systemPrompt = currentConfig.systemPrompt;
        
        // With the updated suggestions system, promptChanges should always contain the complete prompt
        updateData.systemPrompt = suggestions.promptChanges;
        
        // Check if this is actually a change from the current prompt
        const isActualChange = suggestions.promptChanges.trim() !== (currentConfig.systemPrompt || '').trim();
        appliedChanges.promptChanged = isActualChange;
        
        if (isActualChange) {
          console.log(`  ✅ Prompt will be updated with improvements`);
        } else {
          console.log(`  ℹ️ Prompt preserved (no changes needed)`);
        }
      }

      // Apply setting changes
      if (selectedSuggestions.settingChanges && selectedSuggestions.settingChanges.length > 0 && suggestions.settingChanges) {
        console.log(`⚙️ Applying setting changes...`);
        appliedChanges.previousValues.settings = {};
        
        for (const settingKey of selectedSuggestions.settingChanges) {
          if (suggestions.settingChanges[settingKey] !== undefined) {
            console.log(`  📊 Updating setting: ${settingKey}`);
            appliedChanges.previousValues.settings[settingKey] = currentConfig[settingKey];
            updateData[settingKey] = suggestions.settingChanges[settingKey];
            appliedChanges.settingsChanged.push(settingKey);
          }
        }
        
        console.log(`  ✅ ${appliedChanges.settingsChanged.length} settings will be updated`);
      }

      // Apply knowledge base changes
      if (selectedSuggestions.knowledgeBaseChanges && selectedSuggestions.knowledgeBaseChanges.length > 0 && suggestions.knowledgeBaseChanges) {
        console.log(`📚 Applying knowledge base changes...`);
        appliedChanges.previousValues.knowledgeBase = currentConfig.knowledgeBase || currentConfig.knowledgeBaseIndex;
        
        // Handle knowledge base updates based on the suggestion structure
        if (suggestions.knowledgeBaseChanges) {
          updateData.knowledgeBase = suggestions.knowledgeBaseChanges;
          appliedChanges.knowledgeBaseChanged = selectedSuggestions.knowledgeBaseChanges;
        }
        
        console.log(`  ✅ Knowledge base will be updated`);
      }

      // Apply updates if any changes were made
      if (Object.keys(updateData).length === 0) {
        console.log(`ℹ️ No changes to apply`);
        return {
          success: true,
          appliedChanges,
          updatedConfig: currentConfig,
          changeLog: 'No changes were applied - no suggestions selected or available'
        };
      }

      // Add metadata to track the update
      updateData.lastUpdated = new Date().toISOString();
      updateData.lastUpdateReason = 'Applied analysis cycle suggestions';

      console.log(`💾 Applying ${Object.keys(updateData).length} changes to test agent...`);
      
      // Update the test agent configuration
      await testAgentRef.update(updateData);

      // Get the updated configuration
      const updatedSnapshot = await testAgentRef.get();
      const updatedConfig = updatedSnapshot.data()!;

      // Generate change log
      const changeLog = this.generateChangeLog(appliedChanges, suggestions);

      console.log(`✅ Test agent configuration updated successfully`);
      console.log(`📋 Changes applied:`, {
        promptChanged: appliedChanges.promptChanged,
        settingsChanged: appliedChanges.settingsChanged.length,
        knowledgeBaseChanged: appliedChanges.knowledgeBaseChanged.length
      });

      return {
        success: true,
        appliedChanges,
        updatedConfig,
        changeLog
      };

    } catch (error) {
      console.error('❌ Error updating test agent configuration:', error);
      return {
        success: false,
        error: `Failed to update test agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Generate a human-readable change log
   */
  private generateChangeLog(appliedChanges: AppliedChanges, suggestions: CycleSuggestions): string {
    const changes: string[] = [];
    
    if (appliedChanges.promptChanged) {
      changes.push(`✅ System prompt updated based on analysis suggestions`);
    }

    if (appliedChanges.settingsChanged.length > 0) {
      changes.push(`⚙️ Settings updated: ${appliedChanges.settingsChanged.join(', ')}`);
    }

    if (appliedChanges.knowledgeBaseChanged.length > 0) {
      changes.push(`📚 Knowledge base updated: ${appliedChanges.knowledgeBaseChanged.length} changes`);
    }

    if (suggestions.reasoning) {
      changes.push(`💭 Reasoning: ${suggestions.reasoning}`);
    }

    return changes.join('\n');
  }

  /**
   * Create a rollback entry for potential future use
   */
  async createRollbackEntry(
    tenantId: string,
    sessionId: string,
    agentId: string,
    appliedChanges: AppliedChanges,
    cycleId: string
  ): Promise<void> {
    try {
      const rollbackRef = firestore
        .collection('tenants').doc(tenantId)
        .collection('trainingSessions').doc(sessionId)
        .collection('configChanges');

      await rollbackRef.add({
        agentId,
        cycleId,
        timestamp: new Date().toISOString(),
        changeType: 'applied_suggestions',
        appliedChanges: {
          promptChanged: appliedChanges.promptChanged,
          settingsChanged: appliedChanges.settingsChanged,
          knowledgeBaseChanged: appliedChanges.knowledgeBaseChanged
        },
        previousValues: appliedChanges.previousValues,
        canRollback: true
      });

      console.log(`📝 Rollback entry created for potential future use`);
    } catch (error) {
      console.warn('⚠️ Failed to create rollback entry (non-blocking):', error);
    }
  }
}

export const updateTestAgentService = new UpdateTestAgentService();