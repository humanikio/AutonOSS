import { createTestAgentService } from '../startAgentTraining/createTestAgent';

interface UpdateTrainingConfigsParams {
  tenantId: string;
  sessionId: string;
  agentId: string;
  configChanges: {
    // Core agent info
    agentName?: string;
    description?: string;
    
    // LLM and conversation settings
    systemPrompt?: string;
    llmModel?: string;
    language?: string;
    temperature?: number;
    maxTokens?: number;
    firstMessage?: string;
    
    // Voice settings
    voiceSettings?: {
      model_id?: string;
      speed?: number;
      stability?: number;
      similarity_boost?: number;
      optimize_streaming_latency?: number;
    };
    
    // Knowledge base
    knowledgeBase?: Array<{
      id: string;
      name: string;
      type: string;
      documentCount?: number;
    }>;
    ragSettings?: {
      enabled: boolean;
      maxDocuments?: number;
      threshold?: number;
    };
    
    // Tools
    builtInTools?: { [key: string]: any };
    customTools?: Array<any>;
    mcpServerIds?: string[];
    
    // Advanced settings
    turnSettings?: {
      mode?: string;
      turn_timeout?: number;
      silence_end_call_timeout?: number;
    };
    asrSettings?: {
      provider?: string;
      quality?: string;
      user_input_audio_format?: string;
      keywords?: string[];
    };
  };
}

interface UpdateTrainingConfigsResult {
  success: boolean;
  config?: any;
  error?: string;
}

/**
 * Update the test agent configuration in a training session
 * This allows manual edits before publishing to production
 */
export const updateTrainingConfigs = async (params: UpdateTrainingConfigsParams): Promise<UpdateTrainingConfigsResult> => {
  try {
    const { tenantId, sessionId, agentId, configChanges } = params;
    
    console.log(`🔄 Updating training configs for session: ${sessionId}`);
    console.log(`  - Agent ID: ${agentId}`);
    console.log(`  - Changes: ${Object.keys(configChanges).join(', ')}`);

    // In training mode, system prompt changes should go to the test agent config, not Firestore
    // The system prompt will be applied to production via the publish workflow

    // Update the test agent configuration using the existing service
    const updateResult = await createTestAgentService.updateTestAgentConfig(
      tenantId,
      sessionId,
      agentId,
      configChanges,
      'Manual edits in publish modal'
    );

    if (!updateResult.success || !updateResult.testAgentConfig) {
      console.error('L Failed to update test agent config:', updateResult.error);
      return {
        success: false,
        error: updateResult.error || 'Failed to update test agent configuration'
      };
    }

    const updatedConfig = updateResult.testAgentConfig;
    
    console.log(`✅ Updated test agent configuration`);
    console.log(`  - New Config Version: ${updatedConfig.configVersion}`);
    console.log(`  - Last Modified: ${updatedConfig.lastModified}`);

    // Use the test agent's system prompt (contains training changes)
    const currentSystemPrompt = updatedConfig.systemPrompt || '';

    // Return the updated configuration
    return {
      success: true,
      config: {
        // Core agent info
        agentName: updatedConfig.agentName,
        description: updatedConfig.description,
        originalAgentId: updatedConfig.originalAgentId,
        
        // LLM and conversation settings
        systemPrompt: currentSystemPrompt,
        llmModel: updatedConfig.llmModel,
        language: updatedConfig.language,
        temperature: updatedConfig.temperature,
        maxTokens: updatedConfig.maxTokens,
        firstMessage: updatedConfig.firstMessage,
        
        // Voice settings
        voiceSettings: updatedConfig.voiceSettings,
        
        // Knowledge base
        knowledgeBase: updatedConfig.knowledgeBase,
        ragSettings: updatedConfig.ragSettings,
        
        // Tools
        builtInTools: updatedConfig.builtInTools,
        customTools: updatedConfig.customTools,
        mcpServerIds: updatedConfig.mcpServerIds,
        
        // Advanced settings
        turnSettings: updatedConfig.turnSettings,
        asrSettings: updatedConfig.asrSettings,
        
        // Training metadata
        configVersion: updatedConfig.configVersion,
        lastModified: updatedConfig.lastModified,
        appliedSuggestions: updatedConfig.appliedSuggestions,
        configHistory: updatedConfig.configHistory
      }
    };

  } catch (error: any) {
    console.error('L Error updating training configs:', error);
    
    return {
      success: false,
      error: `Failed to update training configs: ${error.message}`
    };
  }
};