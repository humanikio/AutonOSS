// Maps frontend configuration updates to 11Labs API payload format
export function build11LabsConfigPayload(updates: any): any {
  const payload: any = {
    conversation_config: {}
  };
  
  console.log('🔧 Building 11Labs payload from updates:', updates);
  
  // === AGENT/LLM CONFIGURATION ===
  if (updates.llm || updates.language || updates.temperature !== undefined || 
      updates.max_tokens !== undefined || updates.prompt !== undefined || updates.timezone ||
      updates.ignore_default_personality !== undefined || updates.first_message !== undefined ||
      updates.built_in_tools !== undefined) {
    
    payload.conversation_config.agent = {};
    
    // Basic agent settings
    if (updates.language) {
      payload.conversation_config.agent.language = updates.language;
    }
    
    if (updates.first_message !== undefined) {
      payload.conversation_config.agent.first_message = updates.first_message;
    }
    
    // LLM prompt settings
    if (updates.llm || updates.temperature !== undefined || updates.max_tokens !== undefined ||
        updates.prompt !== undefined || updates.timezone || updates.ignore_default_personality !== undefined || 
        updates.built_in_tools !== undefined) {
      
      payload.conversation_config.agent.prompt = {};
      
      if (updates.llm) {
        payload.conversation_config.agent.prompt.llm = updates.llm;
      }
      
      if (updates.temperature !== undefined) {
        payload.conversation_config.agent.prompt.temperature = updates.temperature;
      }
      
      if (updates.max_tokens !== undefined) {
        payload.conversation_config.agent.prompt.max_tokens = updates.max_tokens;
      }
      
      // NOTE: System prompts are now stored internally only and injected via dynamic variables
      // Do NOT sync prompt updates to 11Labs to preserve the template structure
      // if (updates.prompt !== undefined) {
      //   payload.conversation_config.agent.prompt.prompt = updates.prompt;
      // }
      
      if (updates.timezone) {
        payload.conversation_config.agent.prompt.timezone = updates.timezone;
      }
      
      if (updates.ignore_default_personality !== undefined) {
        payload.conversation_config.agent.prompt.ignore_default_personality = updates.ignore_default_personality;
      }
      
      if (updates.built_in_tools !== undefined) {
        payload.conversation_config.agent.prompt.built_in_tools = updates.built_in_tools;
        console.log('✅ Added built-in tools:', updates.built_in_tools);
      }
    }
    
    console.log('🤖 Added agent configuration:', payload.conversation_config.agent);
  }
  
  // === TTS CONFIGURATION (excluding voice selection) ===
  if (updates.tts_model_id || updates.agent_output_audio_format || 
      updates.speed !== undefined || updates.stability !== undefined ||
      updates.similarity_boost !== undefined || updates.optimize_streaming_latency !== undefined ||
      updates.pronunciation_dictionary_locators || updates.supported_voices) {
    
    payload.conversation_config.tts = {};
    
    if (updates.tts_model_id) {
      // Validate TTS model based on language
      let modelId = updates.tts_model_id;
      const language = updates.language || payload.conversation_config.agent?.language || 'en';
      
      // 11Labs validation: English agents must use turbo or flash v2 (not v2_5)
      if (language === 'en' && modelId === 'eleven_turbo_v2_5') {
        modelId = 'eleven_turbo_v2'; // Use v2 instead of v2_5 for English
        console.log('🔄 Adjusted TTS model for English agent: eleven_turbo_v2_5 → eleven_turbo_v2');
      }
      
      payload.conversation_config.tts.model_id = modelId;
    }
    
    if (updates.agent_output_audio_format) {
      payload.conversation_config.tts.agent_output_audio_format = updates.agent_output_audio_format;
    }
    
    if (updates.speed !== undefined) {
      payload.conversation_config.tts.speed = updates.speed;
    }
    
    if (updates.stability !== undefined) {
      payload.conversation_config.tts.stability = updates.stability;
    }
    
    if (updates.similarity_boost !== undefined) {
      payload.conversation_config.tts.similarity_boost = updates.similarity_boost;
    }
    
    if (updates.optimize_streaming_latency !== undefined) {
      payload.conversation_config.tts.optimize_streaming_latency = updates.optimize_streaming_latency;
    }
    
    // Advanced TTS features
    if (updates.pronunciation_dictionary_locators) {
      payload.conversation_config.tts.pronunciation_dictionary_locators = updates.pronunciation_dictionary_locators;
    }
    
    if (updates.supported_voices) {
      payload.conversation_config.tts.supported_voices = updates.supported_voices;
    }
    
    console.log('🎙️ Added TTS configuration:', payload.conversation_config.tts);
  }
  
  // === ASR CONFIGURATION ===
  if (updates.asr_quality || updates.user_input_audio_format || 
      updates.asr_provider || updates.keywords) {
    
    payload.conversation_config.asr = {};
    
    if (updates.asr_provider) {
      payload.conversation_config.asr.provider = updates.asr_provider;
    }
    
    if (updates.asr_quality) {
      payload.conversation_config.asr.quality = updates.asr_quality;
    }
    
    if (updates.user_input_audio_format) {
      payload.conversation_config.asr.user_input_audio_format = updates.user_input_audio_format;
    }
    
    if (updates.keywords) {
      payload.conversation_config.asr.keywords = Array.isArray(updates.keywords) ? updates.keywords : [];
    }
    
    console.log('🎤 Added ASR configuration:', payload.conversation_config.asr);
  }
  
  // === TURN HANDLING CONFIGURATION ===
  if (updates.turn_mode || updates.turn_timeout !== undefined ||
      updates.silence_end_call_timeout !== undefined) {
    
    payload.conversation_config.turn = {};
    
    if (updates.turn_mode) {
      payload.conversation_config.turn.mode = updates.turn_mode;
    }
    
    if (updates.turn_timeout !== undefined) {
      payload.conversation_config.turn.turn_timeout = updates.turn_timeout;
    }
    
    if (updates.silence_end_call_timeout !== undefined) {
      payload.conversation_config.turn.silence_end_call_timeout = updates.silence_end_call_timeout;
    }
    
    console.log('⏰ Added turn configuration:', payload.conversation_config.turn);
  }
  
  // === CONVERSATION CONFIGURATION ===
  if (updates.text_only !== undefined || updates.max_duration_seconds !== undefined ||
      updates.client_events !== undefined) {
    
    payload.conversation_config.conversation = {};
    
    if (updates.text_only !== undefined) {
      payload.conversation_config.conversation.text_only = updates.text_only;
    }
    
    if (updates.max_duration_seconds !== undefined) {
      payload.conversation_config.conversation.max_duration_seconds = updates.max_duration_seconds;
    }
    
    if (updates.client_events !== undefined) {
      payload.conversation_config.conversation.client_events = Array.isArray(updates.client_events) ? updates.client_events : [];
    } else {
      // CRITICAL: Always preserve client_events to maintain conversation initiation capability
      payload.conversation_config.conversation.client_events = ["conversation_initiation_metadata"];
    }
    
    console.log('💬 Added conversation configuration:', payload.conversation_config.conversation);
  }
  
  // Remove conversation_config if it's empty
  if (Object.keys(payload.conversation_config).length === 0) {
    delete payload.conversation_config;
  }
  
  // === PERSONALIZATION/DYNAMIC VARIABLES ===
  // Add default values for dynamic variables to prevent "misconfigured" errors
  payload.personalization = {
    dynamic_variables: {
      systemPrompt: "You are a helpful AI assistant. Please be professional and courteous in all interactions.",
      actionContext: "general"
    }
  };
  
  console.log('🔧 Added default dynamic variable placeholders to prevent misconfiguration');
  
  // CRITICAL: Clear platform overrides that block configuration updates
  // This removes the locks that prevent 11Labs from accepting our updates
  payload.platform_settings = {
    overrides: {
      enable_conversation_initiation_client_data_from_webhook: true,  // Enable client data events
      conversation_config_override: {
        tts: {
          voice_id: true  // Allow voice changes
        },
        conversation: {
          text_only: false  // Allow text_only changes
        },
        agent: {
          first_message: true,  // Allow first message changes
          language: true,       // Allow language changes  
          prompt: {
            prompt: true,              // Allow prompt changes
            native_mcp_server_ids: true
          }
        }
      }
    }
  };
  
  console.log('🔓 Added platform settings to clear overrides');
  console.log('📦 Final 11Labs payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}