import admin from 'firebase-admin';

// Interface for the 11Labs agent config (from get11LabsAgentConfig)
interface ElevenLabsAgentConfig {
  agent_id: string;
  name: string;
  conversation_config: {
    asr?: {
      quality?: string;
      provider?: string;
      user_input_audio_format?: string;
      keywords?: string[];
    };
    turn?: {
      turn_timeout?: number;
      silence_end_call_timeout?: number;
      mode?: string;
    };
    tts?: {
      model_id?: string;
      voice_id?: string;
      supported_voices?: any[];
      agent_output_audio_format?: string;
      optimize_streaming_latency?: number;
      stability?: number;
      speed?: number;
      similarity_boost?: number;
      pronunciation_dictionary_locators?: any[];
    };
    conversation?: {
      text_only?: boolean;
      max_duration_seconds?: number;
      client_events?: string[];
    };
    language_presets?: any;
    agent?: {
      first_message?: string;
      language?: string;
      dynamic_variables?: any;
      prompt?: {
        prompt?: string;
        llm?: string;
        temperature?: number;
        max_tokens?: number;
        tool_ids?: string[];
        built_in_tools?: any;
        knowledge_base?: any[];
        custom_llm?: any;
        rag?: any;
        timezone?: string;
        tools?: any[];
        ignore_default_personality?: boolean;
        mcp_server_ids?: string[];
        native_mcp_server_ids?: string[];
      };
    };
  };
  metadata?: {
    created_at_unix_secs?: number;
  };
  platform_settings?: {
    auth?: any;
    evaluation?: any;
    widget?: any;
    data_collection?: any;
    overrides?: any;
    call_limits?: any;
    ban?: any;
    privacy?: any;
    workspace_overrides?: any;
    testing?: any;
    safety?: any;
  };
  phone_numbers?: any[];
  workflow?: any;
  access_info?: any;
  tags?: string[];
}

export async function updateFirestoreRecords(
  tenantId: string,
  agentId: string,
  elevenLabsConfig: ElevenLabsAgentConfig
): Promise<void> {
  try {
    const db = admin.firestore();
    const agentRef = db.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
    
    console.log(`🔄 Updating Firestore records for agent: ${agentId}`);
    
    // Prepare update data object with comprehensive mapping
    const updateData: any = {
      // Update timestamps
      lastRefreshedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Store 11Labs agent ID for future reference
      elevenLabsAgentId: elevenLabsConfig.agent_id,
      
      // Store raw 11Labs config for debugging/reference (optional)
      elevenLabsFullConfig: elevenLabsConfig,
    };
    
    // === VOICE/TTS CONFIGURATION ===
    if (elevenLabsConfig.conversation_config?.tts) {
      const tts = elevenLabsConfig.conversation_config.tts;
      
      console.log('🎙️ Processing TTS settings:', {
        voice_id: tts.voice_id,
        model_id: tts.model_id,
        speed: tts.speed,
        stability: tts.stability,
        similarity_boost: tts.similarity_boost,
        optimize_streaming_latency: tts.optimize_streaming_latency,
        agent_output_audio_format: tts.agent_output_audio_format
      });
      
      // Current voice selection
      if (tts.voice_id) {
        updateData.currentVoiceId = tts.voice_id;
        updateData.selectedVoiceId = tts.voice_id; // For backward compatibility
      }
      
      // Comprehensive voice settings based on actual 11Labs response
      updateData.voiceSettings = {
        // Core voice parameters (from debug data)
        stability: tts.stability !== undefined ? tts.stability : 0.5,
        speed: tts.speed !== undefined ? tts.speed : 1.0,
        similarity_boost: tts.similarity_boost !== undefined ? tts.similarity_boost : 0.8,
        
        // Latency optimization (from debug: "optimize_streaming_latency": 3)
        optimize_streaming_latency: tts.optimize_streaming_latency !== undefined ? tts.optimize_streaming_latency : 0,
        
        // TTS model (from debug: "model_id": "eleven_turbo_v2_5" - using v2.5 for multi-language support)
        model_id: tts.model_id || 'eleven_turbo_v2_5',
        
        // Audio format (from debug: "agent_output_audio_format": "pcm_16000")
        agent_output_audio_format: tts.agent_output_audio_format || 'pcm_16000'
      };
      
      // Advanced TTS features
      if (tts.supported_voices && Array.isArray(tts.supported_voices)) {
        updateData.supportedVoices = tts.supported_voices;
      }
      
      if (tts.pronunciation_dictionary_locators && Array.isArray(tts.pronunciation_dictionary_locators)) {
        updateData.pronunciationDictionaries = tts.pronunciation_dictionary_locators;
      }
    }
    
    // === ASR (SPEECH RECOGNITION) CONFIGURATION ===
    if (elevenLabsConfig.conversation_config?.asr) {
      const asr = elevenLabsConfig.conversation_config.asr;
      
      console.log('🎤 Processing ASR settings:', asr);
      
      updateData.asrSettings = {
        // From debug: "provider": "elevenlabs", "quality": "high"
        provider: asr.provider || 'elevenlabs',
        quality: asr.quality || 'high',
        
        // From debug: "user_input_audio_format": "pcm_16000"
        user_input_audio_format: asr.user_input_audio_format || 'pcm_16000',
        
        // From debug: "keywords": []
        keywords: Array.isArray(asr.keywords) ? asr.keywords : []
      };
    }
    
    // === TURN HANDLING CONFIGURATION ===
    if (elevenLabsConfig.conversation_config?.turn) {
      const turn = elevenLabsConfig.conversation_config.turn;
      
      console.log('⏰ Processing Turn settings:', turn);
      
      updateData.turnSettings = {
        // From debug: "mode": "turn", "turn_timeout": 7, "silence_end_call_timeout": -1
        mode: turn.mode || 'silence',
        turn_timeout: turn.turn_timeout !== undefined ? turn.turn_timeout : 7,
        silence_end_call_timeout: turn.silence_end_call_timeout !== undefined ? turn.silence_end_call_timeout : -1
      };
    }
    
    // === CONVERSATION CONFIGURATION ===
    if (elevenLabsConfig.conversation_config?.conversation) {
      const conv = elevenLabsConfig.conversation_config.conversation;
      
      console.log('💬 Processing Conversation settings:', conv);
      
      updateData.conversationSettings = {
        // From debug: "text_only": false, "max_duration_seconds": 600
        text_only: conv.text_only !== undefined ? conv.text_only : false,
        max_duration_seconds: conv.max_duration_seconds !== undefined ? conv.max_duration_seconds : 600,
        
        // From debug: client_events array with multiple events
        client_events: Array.isArray(conv.client_events) ? conv.client_events : []
      };
    }
    
    // === AGENT/LLM CONFIGURATION ===
    if (elevenLabsConfig.conversation_config?.agent) {
      const agent = elevenLabsConfig.conversation_config.agent;
      
      console.log('🤖 Processing Agent settings:', {
        language: agent.language,
        first_message: agent.first_message,
        llm: agent.prompt?.llm
      });
      
      // Basic agent settings
      updateData.agentSettings = {
        // From debug: "language": "en", "first_message": ""
        language: agent.language || 'en',
        first_message: agent.first_message || '',
        dynamic_variables: agent.dynamic_variables || {}
      };
      
      // LLM and prompt settings
      if (agent.prompt) {
        updateData.llmSettings = {
          // From debug: "llm": "gemini-2.0-flash"
          llm: agent.prompt.llm || 'gemini-2.0-flash',
          
          // From debug: "temperature": 0, "max_tokens": -1
          temperature: agent.prompt.temperature !== undefined ? agent.prompt.temperature : 0,
          max_tokens: agent.prompt.max_tokens !== undefined ? agent.prompt.max_tokens : -1,
          
          // NOTE: Do NOT sync prompt from 11Labs back to Firestore
          // The 11Labs prompt is now a template with {{variables}}
          // The real prompt stays in Firestore and gets injected at runtime
          // prompt: agent.prompt.prompt || '',
          timezone: agent.prompt.timezone || null,
          ignore_default_personality: agent.prompt.ignore_default_personality !== undefined ? agent.prompt.ignore_default_personality : false
        };
        
        // Tools and integrations
        if (Array.isArray(agent.prompt.tool_ids)) {
          updateData.toolIds = agent.prompt.tool_ids;
        }
        
        if (agent.prompt.built_in_tools) {
          updateData.builtInTools = agent.prompt.built_in_tools;
        }
        
        if (Array.isArray(agent.prompt.knowledge_base)) {
          updateData.knowledgeBase = agent.prompt.knowledge_base;
        }
        
        if (agent.prompt.custom_llm) {
          updateData.customLlm = agent.prompt.custom_llm;
        }
        
        // RAG settings from debug data
        if (agent.prompt.rag) {
          updateData.ragSettings = {
            enabled: agent.prompt.rag.enabled !== undefined ? agent.prompt.rag.enabled : false,
            embedding_model: agent.prompt.rag.embedding_model || 'e5_mistral_7b_instruct',
            max_vector_distance: agent.prompt.rag.max_vector_distance !== undefined ? agent.prompt.rag.max_vector_distance : 0.6,
            max_documents_length: agent.prompt.rag.max_documents_length !== undefined ? agent.prompt.rag.max_documents_length : 50000,
            max_retrieved_rag_chunks_count: agent.prompt.rag.max_retrieved_rag_chunks_count !== undefined ? agent.prompt.rag.max_retrieved_rag_chunks_count : 20
          };
        }
        
        if (Array.isArray(agent.prompt.tools)) {
          updateData.customTools = agent.prompt.tools;
        }
        
        if (Array.isArray(agent.prompt.mcp_server_ids)) {
          updateData.mcpServerIds = agent.prompt.mcp_server_ids;
        }
        
        if (Array.isArray(agent.prompt.native_mcp_server_ids)) {
          updateData.nativeMcpServerIds = agent.prompt.native_mcp_server_ids;
        }
      }
    }
    
    // === PHONE NUMBERS ===
    if (Array.isArray(elevenLabsConfig.phone_numbers) && elevenLabsConfig.phone_numbers.length > 0) {
      console.log('📞 Processing Phone numbers:', elevenLabsConfig.phone_numbers.length, 'numbers found');
      updateData.elevenLabsPhoneNumbers = elevenLabsConfig.phone_numbers;
    }
    
    // === PLATFORM SETTINGS ===
    if (elevenLabsConfig.platform_settings) {
      console.log('⚙️ Processing Platform settings');
      updateData.platformSettings = {
        auth: elevenLabsConfig.platform_settings.auth || null,
        evaluation: elevenLabsConfig.platform_settings.evaluation || null,
        widget: elevenLabsConfig.platform_settings.widget || null,
        data_collection: elevenLabsConfig.platform_settings.data_collection || null,
        overrides: elevenLabsConfig.platform_settings.overrides || null,
        call_limits: elevenLabsConfig.platform_settings.call_limits || null,
        ban: elevenLabsConfig.platform_settings.ban || null,
        privacy: elevenLabsConfig.platform_settings.privacy || null,
        workspace_overrides: elevenLabsConfig.platform_settings.workspace_overrides || null,
        testing: elevenLabsConfig.platform_settings.testing || null,
        safety: elevenLabsConfig.platform_settings.safety || null
      };
    }
    
    // === METADATA & ADDITIONAL INFO ===
    if (elevenLabsConfig.metadata) {
      updateData.elevenLabsMetadata = {
        created_at_unix_secs: elevenLabsConfig.metadata.created_at_unix_secs || null,
        created_at_iso: elevenLabsConfig.metadata.created_at_unix_secs 
          ? new Date(elevenLabsConfig.metadata.created_at_unix_secs * 1000).toISOString()
          : null
      };
    }
    
    if (Array.isArray(elevenLabsConfig.tags)) {
      updateData.elevenLabsTags = elevenLabsConfig.tags;
    }
    
    if (elevenLabsConfig.workflow) {
      updateData.workflow = elevenLabsConfig.workflow;
    }
    
    if (elevenLabsConfig.access_info) {
      updateData.accessInfo = elevenLabsConfig.access_info;
    }
    
    // Log what we're updating
    const updateFields = Object.keys(updateData).filter(key => 
      key !== 'elevenLabsFullConfig' // Don't log the full config in the summary
    );
    console.log('📋 Preparing to update fields:', updateFields);
    
    // Update Firestore document
    await agentRef.update(updateData);
    
    console.log(`✅ Successfully updated Firestore records for agent: ${agentId}`);
    console.log(`📊 Updated ${updateFields.length} configuration categories`);
    
  } catch (error) {
    console.error('❌ Error updating Firestore records:', error);
    throw new Error(`Failed to update Firestore records: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}