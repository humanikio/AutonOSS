// Complete 11Labs Agent Configuration Response Interface
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
      supported_voices?: {
        label?: string;
        voice_id?: string;
        description?: string;
        language?: string;
        model_family?: string;
        optimize_streaming_latency?: number;
        stability?: number;
        speed?: number;
        similarity_boost?: number;
      }[];
      agent_output_audio_format?: string;
      optimize_streaming_latency?: number;
      stability?: number;
      speed?: number;
      similarity_boost?: number;
      pronunciation_dictionary_locators?: {
        pronunciation_dictionary_id?: string;
        version_id?: string;
      }[];
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
      dynamic_variables?: {
        dynamic_variable_placeholders?: any;
      };
      prompt?: {
        prompt?: string;
        llm?: string;
        temperature?: number;
        max_tokens?: number;
        tool_ids?: string[];
        built_in_tools?: any;
        mcp_server_ids?: string[];
        native_mcp_server_ids?: string[];
        knowledge_base?: {
          type?: string;
          name?: string;
          id?: string;
          usage_mode?: string;
        }[];
        custom_llm?: {
          url?: string;
          model_id?: string;
          api_key?: {
            secret_id?: string;
          };
          request_headers?: any;
          api_version?: string;
        };
        ignore_default_personality?: boolean;
        rag?: {
          enabled?: boolean;
          embedding_model?: string;
          max_vector_distance?: number;
          max_documents_length?: number;
          max_retrieved_rag_chunks_count?: number;
        };
        timezone?: string;
        tools?: any[];
      };
    };
  };
  metadata?: {
    created_at_unix_secs?: number;
  };
  platform_settings?: any;
  phone_numbers?: any[];
  workflow?: any;
  access_info?: any;
  tags?: string[];
}

export async function get11LabsAgentConfig(elevenLabsAgentId: string): Promise<ElevenLabsAgentConfig> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!elevenLabsAgentId) {
      throw new Error('ElevenLabs agent ID is required');
    }

    console.log(`Fetching 11Labs agent configuration for: ${elevenLabsAgentId}`);

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('11Labs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const agentConfig = await response.json() as ElevenLabsAgentConfig;
    
    // DETAILED DEBUGGING - Let's see the full response structure
    console.log('\n=== 11LABS AGENT CONFIG DEBUG ===');
    console.log('Full Response:', JSON.stringify(agentConfig, null, 2));
    
    console.log('\n=== KEY SECTIONS BREAKDOWN ===');
    console.log('Agent ID:', agentConfig.agent_id);
    console.log('Agent Name:', agentConfig.name);
    
    if (agentConfig.conversation_config) {
      console.log('\n=== TTS CONFIGURATION ===');
      console.log('TTS Config:', JSON.stringify(agentConfig.conversation_config.tts, null, 2));
      
      console.log('\n=== ASR CONFIGURATION ===');
      console.log('ASR Config:', JSON.stringify(agentConfig.conversation_config.asr, null, 2));
      
      console.log('\n=== TURN HANDLING ===');
      console.log('Turn Config:', JSON.stringify(agentConfig.conversation_config.turn, null, 2));
      
      console.log('\n=== AGENT/LLM CONFIGURATION ===');
      console.log('Agent Config:', JSON.stringify(agentConfig.conversation_config.agent, null, 2));
      
      console.log('\n=== CONVERSATION SETTINGS ===');
      console.log('Conversation Config:', JSON.stringify(agentConfig.conversation_config.conversation, null, 2));
    }
    
    console.log('\n=== PHONE NUMBERS ===');
    console.log('Phone Numbers:', JSON.stringify(agentConfig.phone_numbers, null, 2));
    
    console.log('\n=== PLATFORM SETTINGS ===');
    console.log('Platform Settings:', JSON.stringify(agentConfig.platform_settings, null, 2));
    
    console.log('\n=== METADATA ===');
    console.log('Metadata:', JSON.stringify(agentConfig.metadata, null, 2));
    
    console.log('\n=== TAGS ===');
    console.log('Tags:', agentConfig.tags);
    
    console.log('\n=== END DEBUG ===\n');
    
    console.log(`Successfully retrieved 11Labs agent configuration for: ${agentConfig.name} (${agentConfig.agent_id})`);
    
    return agentConfig;
  } catch (error) {
    console.error('Error getting 11Labs agent configuration:', error);
    throw new Error(`Failed to get 11Labs agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}