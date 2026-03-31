import { createTestAgentService } from '../startAgentTraining/createTestAgent';

interface GetTrainingConfigsParams {
  tenantId: string;
  sessionId: string;
  agentId: string;
}

interface GetTrainingConfigsResult {
  success: boolean;
  config?: any;
  error?: string;
}

/**
 * Get the current test agent configuration from a training session
 * This will be used to populate the publish modal
 */
export const getTrainingConfigs = async (params: GetTrainingConfigsParams): Promise<GetTrainingConfigsResult> => {
  try {
    const { tenantId, sessionId, agentId } = params;
    
    console.log(`=� Getting training configs for session: ${sessionId}`);
    console.log(`  - Agent ID: ${agentId}`);
    console.log(`  - Tenant ID: ${tenantId}`);

    // Get the test agent configuration from the training session subcollection
    const testAgentResult = await createTestAgentService.getTestAgentConfig(
      tenantId,
      sessionId,
      agentId
    );

    if (!testAgentResult.success || !testAgentResult.testAgentConfig) {
      console.error('L Failed to retrieve test agent config:', testAgentResult.error);
      return {
        success: false,
        error: testAgentResult.error || 'Test agent configuration not found'
      };
    }

    const config = testAgentResult.testAgentConfig;
    
    console.log(`✅ Retrieved test agent configuration`);
    console.log(`  - Config Version: ${config.configVersion}`);
    console.log(`  - Last Modified: ${config.lastModified}`);
    console.log(`  - Applied Suggestions: ${config.appliedSuggestions?.length || 0}`);
    
    // Debug: Log key training config values
    console.log(`🔍 Debug - Test Agent Config Values:`);
    console.log(`  - System Prompt: ${config.systemPrompt ? 'Set (' + config.systemPrompt.length + ' chars)' : 'Not set'}`);
    console.log(`  - LLM Model: ${config.llmModel}`);
    console.log(`  - Language: ${config.language}`);
    console.log(`  - Temperature: ${config.temperature}`);
    console.log(`  - Max Tokens: ${config.maxTokens}`);
    console.log(`  - First Message: ${config.firstMessage ? 'Set (' + config.firstMessage.length + ' chars)' : 'Not set'}`);

    // Use the test agent's system prompt (which contains training changes)
    // Don't override with production system prompt!
    const trainingSystemPrompt = config.systemPrompt || '';
    console.log(`  - Using test agent system prompt: ${trainingSystemPrompt ? 'Available (' + trainingSystemPrompt.length + ' chars)' : 'Not set'}`);

    // Return the full configuration for the modal
    return {
      success: true,
      config: {
        // Core agent info
        agentName: config.agentName,
        description: config.description,
        originalAgentId: config.originalAgentId,
        
        // LLM and conversation settings
        systemPrompt: trainingSystemPrompt,
        llmModel: config.llmModel,
        language: config.language,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        firstMessage: config.firstMessage,
        
        // Voice settings
        voiceSettings: config.voiceSettings,
        
        // Knowledge base
        knowledgeBase: config.knowledgeBase,
        ragSettings: config.ragSettings,
        
        // Tools
        builtInTools: config.builtInTools,
        customTools: config.customTools,
        mcpServerIds: config.mcpServerIds,
        
        // Advanced settings
        turnSettings: config.turnSettings,
        asrSettings: config.asrSettings,
        
        // Training metadata
        configVersion: config.configVersion,
        lastModified: config.lastModified,
        appliedSuggestions: config.appliedSuggestions,
        configHistory: config.configHistory
      }
    };

  } catch (error: any) {
    console.error('L Error getting training configs:', error);
    
    return {
      success: false,
      error: `Failed to get training configs: ${error.message}`
    };
  }
};