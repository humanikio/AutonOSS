import { retrieveCycleService } from './retrieveCycle';
import { updateTestAgentService } from './updateTestAgent';

/**
 * Main orchestrator service for applying analysis cycle suggestions to test agent configurations
 * Coordinates retrieval, validation, and application of suggestions
 */

export interface ApplySuggestionsRequest {
  tenantId: string;
  sessionId: string;
  agentId: string;
  cycleId: string;
  selectedSuggestions?: {
    promptChanges?: boolean;
    settingChanges?: string[];
    knowledgeBaseChanges?: string[];
  };
}

export interface ApplySuggestionsResult {
  success: boolean;
  appliedChanges?: {
    promptChanged: boolean;
    settingsChanged: string[];
    knowledgeBaseChanged: string[];
    previousValues: any;
  };
  updatedConfig?: any;
  changeLog?: string;
  cycleInfo?: {
    cycleId: string;
    cycleNumber: number;
    appliedSuggestionTypes: string[];
  };
  error?: string;
}

export class ApplySuggestionsService {
  /**
   * Apply analysis cycle suggestions to test agent configuration
   */
  async applySuggestions(request: ApplySuggestionsRequest): Promise<ApplySuggestionsResult> {
    try {
      const { tenantId, sessionId, agentId, cycleId, selectedSuggestions } = request;
      
      console.log(`🚀 Starting suggestion application process`);
      console.log(`  - Tenant: ${tenantId}`);
      console.log(`  - Session: ${sessionId}`);
      console.log(`  - Agent: ${agentId}`);
      console.log(`  - Cycle: ${cycleId}`);
      console.log(`  - Selection mode: ${selectedSuggestions ? 'Selective' : 'Apply All'}`);

      // Step 1: Retrieve analysis cycle data
      console.log(`\n📋 Step 1: Retrieving analysis cycle data...`);
      const cycleResult = await retrieveCycleService.getCycle({
        tenantId,
        sessionId,
        cycleId
      });

      if (!cycleResult.success || !cycleResult.cycleData) {
        console.error(`❌ Failed to retrieve cycle data:`, cycleResult.error);
        return {
          success: false,
          error: cycleResult.error
        };
      }

      const cycleData = cycleResult.cycleData;
      console.log(`✅ Cycle data retrieved: ${cycleData.cycleId}`);

      // Step 2: Validate suggestions
      console.log(`\n🔍 Step 2: Validating suggestions...`);
      const validation = retrieveCycleService.validateSuggestions(cycleData);

      if (!validation.hasApplicableSuggestions) {
        console.warn(`⚠️ No applicable suggestions found`);
        return {
          success: false,
          error: `No applicable suggestions found in cycle ${cycleId}. ${validation.warnings.join('; ')}`
        };
      }

      console.log(`✅ Validation passed - ${validation.availableSuggestionTypes.length} suggestion types available`);

      // Step 3: Determine which suggestions to apply
      console.log(`\n⚙️ Step 3: Determining suggestions to apply...`);
      const suggestionsToApply = this.determineSuggestionsToApply(
        cycleData.suggestions!,
        selectedSuggestions,
        validation.availableSuggestionTypes
      );

      console.log(`📊 Suggestions to apply:`, suggestionsToApply);

      // Step 4: Apply suggestions to test agent
      console.log(`\n🔧 Step 4: Applying suggestions to test agent...`);
      const updateResult = await updateTestAgentService.updateTestAgent({
        tenantId,
        sessionId,
        agentId,
        suggestions: cycleData.suggestions!,
        selectedSuggestions: suggestionsToApply
      });

      if (!updateResult.success) {
        console.error(`❌ Failed to update test agent:`, updateResult.error);
        return {
          success: false,
          error: updateResult.error
        };
      }

      console.log(`✅ Test agent updated successfully`);

      // Step 5: Create rollback entry for audit trail
      console.log(`\n📝 Step 5: Creating audit trail...`);
      if (updateResult.appliedChanges) {
        await updateTestAgentService.createRollbackEntry(
          tenantId,
          sessionId,
          agentId,
          updateResult.appliedChanges,
          cycleId
        ).catch(error => {
          console.warn(`⚠️ Failed to create audit trail (non-blocking):`, error);
        });
      }

      // Step 6: Prepare response
      const appliedSuggestionTypes = [];
      if (updateResult.appliedChanges?.promptChanged) appliedSuggestionTypes.push('promptChanges');
      if (updateResult.appliedChanges?.settingsChanged.length) appliedSuggestionTypes.push('settingChanges');
      if (updateResult.appliedChanges?.knowledgeBaseChanged.length) appliedSuggestionTypes.push('knowledgeBaseChanges');

      console.log(`\n🎉 Suggestion application completed successfully!`);
      console.log(`📊 Summary:`, {
        appliedTypes: appliedSuggestionTypes,
        changesCount: appliedSuggestionTypes.length,
        cycleNumber: cycleData.cycleNumber
      });

      return {
        success: true,
        appliedChanges: updateResult.appliedChanges,
        updatedConfig: updateResult.updatedConfig,
        changeLog: updateResult.changeLog,
        cycleInfo: {
          cycleId: cycleData.cycleId,
          cycleNumber: cycleData.cycleNumber,
          appliedSuggestionTypes
        }
      };

    } catch (error) {
      console.error('❌ Error in suggestion application process:', error);
      return {
        success: false,
        error: `Suggestion application failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Determine which suggestions to apply based on user selection or defaults
   */
  private determineSuggestionsToApply(
    suggestions: any,
    selectedSuggestions?: ApplySuggestionsRequest['selectedSuggestions'],
    availableTypes: string[] = []
  ): NonNullable<ApplySuggestionsRequest['selectedSuggestions']> {
    
    // If no selection provided, apply ALL available suggestions
    if (!selectedSuggestions) {
      console.log(`📋 No selections provided - applying ALL available suggestions`);
      
      const applyAll = {
        promptChanges: availableTypes.includes('promptChanges') && !!suggestions.promptChanges,
        settingChanges: availableTypes.includes('settingChanges') && suggestions.settingChanges ? 
          Object.keys(suggestions.settingChanges) : [],
        knowledgeBaseChanges: availableTypes.includes('knowledgeBaseChanges') && suggestions.knowledgeBaseChanges ?
          Object.keys(suggestions.knowledgeBaseChanges) : []
      };

      console.log(`🔄 Auto-determined selections:`, applyAll);
      return applyAll;
    }

    // Use provided selections
    console.log(`👤 Using user-provided selections`);
    return {
      promptChanges: selectedSuggestions.promptChanges || false,
      settingChanges: selectedSuggestions.settingChanges || [],
      knowledgeBaseChanges: selectedSuggestions.knowledgeBaseChanges || []
    };
  }

  /**
   * Get a preview of what would be applied without actually applying
   */
  async previewSuggestions(request: Omit<ApplySuggestionsRequest, 'selectedSuggestions'>): Promise<{
    success: boolean;
    preview?: {
      cycleInfo: {
        cycleId: string;
        cycleNumber: number;
        timestamp: string;
      };
      availableSuggestions: {
        promptChanges?: string;
        settingChanges?: any;
        knowledgeBaseChanges?: any;
        reasoning?: string;
      };
      suggestionsCount: number;
    };
    error?: string;
  }> {
    try {
      console.log(`👁️ Generating suggestion preview for cycle: ${request.cycleId}`);

      const cycleResult = await retrieveCycleService.getCycle(request);

      if (!cycleResult.success || !cycleResult.cycleData) {
        return {
          success: false,
          error: cycleResult.error
        };
      }

      const cycleData = cycleResult.cycleData;
      const validation = retrieveCycleService.validateSuggestions(cycleData);

      return {
        success: true,
        preview: {
          cycleInfo: {
            cycleId: cycleData.cycleId,
            cycleNumber: cycleData.cycleNumber,
            timestamp: cycleData.timestamp
          },
          availableSuggestions: cycleData.suggestions || {},
          suggestionsCount: validation.availableSuggestionTypes.length
        }
      };

    } catch (error) {
      console.error('❌ Error generating suggestion preview:', error);
      return {
        success: false,
        error: `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const applySuggestionsService = new ApplySuggestionsService();