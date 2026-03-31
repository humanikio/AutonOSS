import { updateAgentConfig, UpdateAgentConfigParams } from '../../../agents/agentManagement/services/updateAgentConfig';
import { SystemPromptService } from '../../../agents/agentManagement/services/systemPromptService';
import { firestore } from '../../../config/firebase';

interface UpdateProdAgentParams {
  tenantId: string;
  agentId: string;
  trainingConfig: {
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

interface UpdateProdAgentResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Publish training configuration to production agent
 * Updates the actual production agent with settings from the training session
 */
export const updateProdAgent = async (params: UpdateProdAgentParams): Promise<UpdateProdAgentResult> => {
  try {
    const { tenantId, agentId, trainingConfig } = params;
    
    console.log(`=� Publishing training configuration to production agent: ${agentId}`);
    console.log(`  - Tenant ID: ${tenantId}`);

    // First, get the production agent to retrieve elevenLabsAgentId
    const agentRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('agents')
      .doc(agentId);

    const agentDoc = await agentRef.get();
    if (!agentDoc.exists) {
      throw new Error('Production agent not found');
    }

    const agentData = agentDoc.data();
    const elevenLabsAgentId = agentData?.elevenLabsAgentId;

    if (!elevenLabsAgentId) {
      throw new Error('Agent does not have ElevenLabs integration configured');
    }

    console.log(`  - ElevenLabs Agent ID: ${elevenLabsAgentId}`);

    // Handle system prompt separately (update both legacy fields and new internal storage)
    if (trainingConfig.systemPrompt) {
      console.log('📝 Updating system prompt in Firestore...');
      
      // Update legacy fields that runtime injection reads from
      await agentRef.update({
        prompt: trainingConfig.systemPrompt,
        'llmSettings.prompt': trainingConfig.systemPrompt,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ System prompt updated in legacy fields');
      
      // Also update new internal storage for future compatibility
      const systemPromptService = new SystemPromptService();
      await systemPromptService.updateSystemPrompt(
        tenantId,
        agentId,
        trainingConfig.systemPrompt,
        'training-publish'
      );
      console.log('✅ System prompt updated in internal storage');
    }

    // Map training config to updateAgentConfig format (excluding system prompt)
    const configUpdates: UpdateAgentConfigParams['updates'] = {};

    // LLM and conversation settings (excluding prompt which is handled above)
    if (trainingConfig.llmModel) configUpdates.llm = trainingConfig.llmModel;
    if (trainingConfig.language) configUpdates.language = trainingConfig.language;
    if (trainingConfig.temperature !== undefined) configUpdates.temperature = trainingConfig.temperature;
    if (trainingConfig.maxTokens !== undefined) configUpdates.max_tokens = trainingConfig.maxTokens;
    if (trainingConfig.firstMessage) configUpdates.first_message = trainingConfig.firstMessage;

    // Built-in tools
    if (trainingConfig.builtInTools) configUpdates.built_in_tools = trainingConfig.builtInTools;

    // Voice settings
    if (trainingConfig.voiceSettings) {
      if (trainingConfig.voiceSettings.model_id) configUpdates.tts_model_id = trainingConfig.voiceSettings.model_id;
      if (trainingConfig.voiceSettings.speed !== undefined) configUpdates.speed = trainingConfig.voiceSettings.speed;
      if (trainingConfig.voiceSettings.stability !== undefined) configUpdates.stability = trainingConfig.voiceSettings.stability;
      if (trainingConfig.voiceSettings.similarity_boost !== undefined) configUpdates.similarity_boost = trainingConfig.voiceSettings.similarity_boost;
      if (trainingConfig.voiceSettings.optimize_streaming_latency !== undefined) configUpdates.optimize_streaming_latency = trainingConfig.voiceSettings.optimize_streaming_latency;
    }

    // ASR settings
    if (trainingConfig.asrSettings) {
      if (trainingConfig.asrSettings.quality) configUpdates.asr_quality = trainingConfig.asrSettings.quality;
      if (trainingConfig.asrSettings.user_input_audio_format) configUpdates.user_input_audio_format = trainingConfig.asrSettings.user_input_audio_format;
      if (trainingConfig.asrSettings.provider) configUpdates.asr_provider = trainingConfig.asrSettings.provider;
      if (trainingConfig.asrSettings.keywords) configUpdates.keywords = trainingConfig.asrSettings.keywords;
    }

    // Turn settings
    if (trainingConfig.turnSettings) {
      if (trainingConfig.turnSettings.mode) configUpdates.turn_mode = trainingConfig.turnSettings.mode;
      if (trainingConfig.turnSettings.turn_timeout !== undefined) configUpdates.turn_timeout = trainingConfig.turnSettings.turn_timeout;
      if (trainingConfig.turnSettings.silence_end_call_timeout !== undefined) configUpdates.silence_end_call_timeout = trainingConfig.turnSettings.silence_end_call_timeout;
    }

    console.log('=� Config updates to apply:', Object.keys(configUpdates));

    // Apply the configuration updates to the production agent
    const updateResult = await updateAgentConfig({
      tenantId,
      agentId,
      elevenLabsAgentId,
      updates: configUpdates
    });

    if (!updateResult.success) {
      throw new Error(`Failed to update production agent: ${updateResult.message}`);
    }

    // Update agent metadata in Firestore to track training publish
    await agentRef.update({
      lastTrainingPublish: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(` Successfully published training configuration to production agent`);
    console.log(`  - Updated fields: ${updateResult.updatedFields.join(', ')}`);

    return {
      success: true,
      message: `Successfully published ${updateResult.updatedFields.length} configuration categories to production agent`
    };

  } catch (error: any) {
    console.error('L Error publishing training config to production:', error);
    
    return {
      success: false,
      error: `Failed to publish to production: ${error.message}`
    };
  }
};