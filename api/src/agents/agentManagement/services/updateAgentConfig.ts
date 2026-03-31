import { build11LabsConfigPayload } from './updateAgentConfig/build11LabsConfigPayload';
import { update11LabsAgent } from './updateAgentConfig/update11LabsAgent';
import { updateFirestoreRecords } from './refreshAgent/updateFirestoreRecords';
import { get11LabsAgentConfig } from './refreshAgent/get11LabsAgentConfig';
import { firestore } from '../../../config/firebase';

export interface UpdateAgentConfigParams {
  tenantId: string;
  agentId: string;
  elevenLabsAgentId: string;
  updates: {
    // LLM & Language Settings
    llm?: string;
    language?: string;
    temperature?: number;
    max_tokens?: number;
    prompt?: string;
    timezone?: string;
    ignore_default_personality?: boolean;
    first_message?: string;
    
    // Built-in Tools
    built_in_tools?: any;
    
    // TTS Settings (excluding voice selection - handled by voice service)
    tts_model_id?: string;
    agent_output_audio_format?: string;
    speed?: number;
    stability?: number;
    similarity_boost?: number;
    optimize_streaming_latency?: number;
    
    // ASR Settings
    asr_quality?: string;
    user_input_audio_format?: string;
    asr_provider?: string;
    keywords?: string[];
    
    // Turn & Conversation Settings
    turn_mode?: string;
    turn_timeout?: number;
    silence_end_call_timeout?: number;
    text_only?: boolean;
    max_duration_seconds?: number;
    client_events?: string[];
    
    // Advanced Settings (excluding KB and tools)
    pronunciation_dictionary_locators?: any[];
    supported_voices?: any[];
  };
}

export interface UpdateAgentConfigResult {
  success: boolean;
  message: string;
  updatedFields: string[];
  elevenLabsAgentId: string;
  elevenLabsAgentName?: string;
}

export async function updateAgentConfig(params: UpdateAgentConfigParams): Promise<UpdateAgentConfigResult> {
  try {
    const { tenantId, agentId, elevenLabsAgentId, updates } = params;
    
    console.log(`🔄 Starting bulk configuration update for agent: ${agentId} (11Labs: ${elevenLabsAgentId})`);
    
    // NOTE: System prompt updates now handled by dedicated endpoint (/agents/:agentId/prompt)
    // This prevents the main config save from interfering with the system prompt
    
    // Step 1: Build the 11Labs API payload from frontend updates (excludes prompt)
    console.log('📦 Step 1: Building 11Labs configuration payload...');
    const elevenLabsPayload = build11LabsConfigPayload(updates);
    
    console.log('🚀 Payload to be sent to 11Labs:', JSON.stringify(elevenLabsPayload, null, 2));
    
    // Step 2: Update 11Labs agent configuration
    console.log('☁️ Step 2: Updating 11Labs agent configuration...');
    await update11LabsAgent(elevenLabsAgentId, elevenLabsPayload);
    
    // Step 3: Get the updated configuration from 11Labs to ensure sync
    console.log('🔄 Step 3: Fetching updated configuration from 11Labs...');
    const updatedConfig = await get11LabsAgentConfig(elevenLabsAgentId);
    
    // Step 4: Sync Firestore with the updated configuration
    console.log('💾 Step 4: Syncing Firestore with updated configuration...');
    await updateFirestoreRecords(tenantId, agentId, updatedConfig);
    
    console.log(`✅ Successfully updated agent configuration: ${agentId}`);
    
    // Determine what fields were updated
    const updatedFields = [];
    
    // LLM & Language updates
    if (updates.llm || updates.language || updates.temperature !== undefined || 
        updates.max_tokens !== undefined || updates.prompt || updates.timezone ||
        updates.ignore_default_personality !== undefined || updates.first_message ||
        updates.built_in_tools) {
      updatedFields.push('agentSettings', 'llmSettings');
    }
    
    // TTS updates
    if (updates.tts_model_id || updates.agent_output_audio_format || 
        updates.speed !== undefined || updates.stability !== undefined ||
        updates.similarity_boost !== undefined || updates.optimize_streaming_latency !== undefined) {
      updatedFields.push('voiceSettings');
    }
    
    // ASR updates
    if (updates.asr_quality || updates.user_input_audio_format || 
        updates.asr_provider || updates.keywords) {
      updatedFields.push('asrSettings');
    }
    
    // Turn & Conversation updates
    if (updates.turn_mode || updates.turn_timeout !== undefined ||
        updates.silence_end_call_timeout !== undefined) {
      updatedFields.push('turnSettings');
    }
    
    if (updates.text_only !== undefined || updates.max_duration_seconds !== undefined ||
        updates.client_events) {
      updatedFields.push('conversationSettings');
    }
    
    // Advanced updates
    if (updates.pronunciation_dictionary_locators || updates.supported_voices) {
      updatedFields.push('advancedVoiceSettings');
    }
    
    // Always update timestamps
    updatedFields.push('lastUpdatedAt', 'updatedAt');
    
    return {
      success: true,
      message: `Successfully updated agent configuration with ${updatedFields.length} categories`,
      updatedFields,
      elevenLabsAgentId,
      elevenLabsAgentName: updatedConfig.name
    };
    
  } catch (error) {
    console.error('❌ Error updating agent configuration:', error);
    
    return {
      success: false,
      message: `Failed to update agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      updatedFields: [],
      elevenLabsAgentId: params.elevenLabsAgentId
    };
  }
}