export interface ElevenLabsAgentConfig {
  name?: string;
  conversation_config: {
    tts?: {
      voice_id: string;
      model: string;
      stability: number;
      similarity_boost: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
        max_tokens?: number;
        tool_ids?: string[];
        built_in_tools?: any;
        knowledge_base?: Array<{
          type: 'text' | 'url' | 'file';
          name: string;
          id: string; // Required by ElevenLabs API
          content?: string;
          url?: string;
          usage_mode?: 'auto' | 'prompt';
        }>;
      };
      first_message: string;
      language: string;
    };
    turn?: {
      interruption_sensitivity: number;
      silence_threshold_ms: number;
    };
  };
}

export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  voice_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  voice_settings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  conversation_config: any;
  platform_settings: any;
  webhook_config?: any;
}

class ElevenLabsAgentService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 500ms between requests

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.throttleRequest();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        console.warn('ElevenLabs rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        throw new Error(`ElevenLabs rate limited: ${response.status} - ${errorText}`);
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (like DELETE requests)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }
    
    return {};
  }

  // Create a new conversational AI agent
  async createAgent(config: ElevenLabsAgentConfig): Promise<ElevenLabsAgent> {
    try {
      console.log('ElevenLabs Agent Config being sent:', JSON.stringify(config, null, 2));
      const response = await this.makeRequest('/convai/agents/create', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      return {
        agent_id: response.agent_id,
        name: response.name,
        voice_id: response.voice_id,
        is_active: response.is_active,
        created_at: response.created_at,
        updated_at: response.updated_at,
        voice_settings: response.voice_settings,
        conversation_config: response.conversation_config,
        platform_settings: response.platform_settings,
        webhook_config: response.webhook_config
      };
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  // Get all agents
  async getAgents(): Promise<ElevenLabsAgent[]> {
    try {
      const response = await this.makeRequest('/convai/agents');
      return response.agents || [];
    } catch (error) {
      console.error('Failed to get agents:', error);
      throw error;
    }
  }

  // Get specific agent
  async getAgent(agentId: string): Promise<ElevenLabsAgent> {
    try {
      return await this.makeRequest(`/convai/agents/${agentId}`);
    } catch (error) {
      console.error(`Failed to get agent ${agentId}:`, error);
      throw error;
    }
  }

  // Update agent
  async updateAgent(agentId: string, config: Partial<ElevenLabsAgentConfig>): Promise<ElevenLabsAgent> {
    try {
      return await this.makeRequest(`/convai/agents/${agentId}`, {
        method: 'PATCH',
        body: JSON.stringify(config),
      });
    } catch (error) {
      console.error(`Failed to update agent ${agentId}:`, error);
      throw error;
    }
  }

  // Delete agent
  async deleteAgent(agentId: string): Promise<void> {
    try {
      await this.makeRequest(`/convai/agents/${agentId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Failed to delete agent ${agentId}:`, error);
      throw error;
    }
  }

  // Helper method to convert our CallAgent types to ElevenLabs format (2025 API)
  convertToElevenLabsConfig(callAgentData: any): ElevenLabsAgentConfig {
    const interruptionSensitivityMap: Record<string, number> = {
      'low': 0.3,
      'medium': 0.5,
      'high': 0.8
    };

    const sensitivity = callAgentData.behaviorSettings?.interruptionSensitivity;
    const interruptionValue = sensitivity && interruptionSensitivityMap[sensitivity] 
      ? interruptionSensitivityMap[sensitivity] 
      : 0.5;

    // Use the exact LLM model name from our wizard (no mapping needed)
    const llmModel = callAgentData.conversationConfig.llmModel || 'gemini-2.0-flash';

    // Build the config using NEW 2025 API format
    const config: any = {
      name: callAgentData.name,
      conversation_config: {
        tts: {
          voice_id: callAgentData.voiceConfig.voiceId,
          model: callAgentData.voiceConfig.model,
          stability: callAgentData.voiceConfig.stability,
          similarity_boost: callAgentData.voiceConfig.similarity,
          style: 0,
          use_speaker_boost: true
        },
        agent: {
          prompt: {
            prompt: callAgentData.conversationConfig.systemPrompt,
            llm: llmModel,
            temperature: callAgentData.conversationConfig.temperature,
            max_tokens: -1,
            tool_ids: [], // For custom tools (empty for now)
            built_in_tools: {} // NEW 2025 format for system tools
          },
          first_message: callAgentData.conversationConfig.firstMessage,
          language: callAgentData.conversationConfig.language
        },
        turn: {
          interruption_sensitivity: interruptionValue,
          silence_threshold_ms: callAgentData.behaviorSettings.silenceTimeoutSeconds * 1000
        }
      }
    };

    // Add built-in system tools using NEW format
    const builtInTools: any = {};
    
    // Use new systemTools structure if available, otherwise fall back to legacy settings
    const systemTools = callAgentData.behaviorSettings?.systemTools;
    
    if (systemTools?.endCall || callAgentData.behaviorSettings?.endCallOnGoodbye) {
      builtInTools.end_call = {
        name: 'end_call',
        description: 'Ends the call when the user says goodbye',
        params: {
          system_tool_type: 'end_call'
        }
      };
    }
    
    if (systemTools?.voicemailDetection || callAgentData.behaviorSettings?.voicemailDetection) {
      builtInTools.voicemail_detection = {
        name: 'voicemail_detection',
        description: 'Detects voicemail systems and optionally leaves a message',
        params: {
          system_tool_type: 'voicemail_detection',
          ...(callAgentData.behaviorSettings.voicemailMessage && {
            voicemail_message: callAgentData.behaviorSettings.voicemailMessage
          })
        }
      };
    }
    
    if (systemTools?.detectLanguage) {
      builtInTools.language_detection = {
        name: 'language_detection',
        description: 'Detects and switches language during conversation',
        params: {
          system_tool_type: 'language_detection'
        }
      };
    }

    if (systemTools?.skipTurn) {
      builtInTools.skip_turn = {
        name: 'skip_turn',
        description: 'Skips turn when user explicitly indicates they need a moment',
        params: {
          system_tool_type: 'skip_turn'
        }
      };
    }

    if (systemTools?.transferToAgent) {
      builtInTools.transfer_to_agent = {
        name: 'transfer_to_agent',
        description: 'Transfers the call to a human agent',
        params: {
          system_tool_type: 'transfer_to_agent'
        }
      };
    }

    if (systemTools?.transferToNumber || (callAgentData.behaviorSettings?.transferEnabled && callAgentData.behaviorSettings?.transferNumbers?.length > 0)) {
      builtInTools.transfer_to_number = {
        name: 'transfer_to_number',
        description: 'Transfers the call to a specific phone number',
        params: {
          system_tool_type: 'transfer_to_number',
          transfers: callAgentData.behaviorSettings.transferNumbers?.map((number: string) => ({
            condition: 'when user requests transfer or when unable to help',
            transfer_destination: {
              phone_number: number,
              type: 'phone'
            }
          })) || []
        }
      };
    }

    if (systemTools?.playKeypardTouchTone) {
      builtInTools.play_keypad_touch_tone = {
        name: 'play_keypad_touch_tone',
        description: 'Plays DTMF tones for keypad interactions',
        params: {
          system_tool_type: 'play_keypad_touch_tone'
        }
      };
    }

    // Set the built-in tools
    config.conversation_config.agent.prompt.built_in_tools = builtInTools;

    // Add custom tool IDs if available
    const customToolIds = callAgentData.behaviorSettings?.customToolIds;
    if (customToolIds && customToolIds.length > 0) {
      config.conversation_config.agent.prompt.tool_ids = customToolIds;
    }

    // Add knowledge bases if available (from wizard custom knowledge)
    const elevenlabsKnowledgeBases = callAgentData.conversationConfig?.knowledgeBase?.elevenlabsKnowledgeBases;
    if (elevenlabsKnowledgeBases && elevenlabsKnowledgeBases.length > 0) {
      // Note: Custom knowledge bases should be created by the controller before calling this method
      // This method expects them to already have valid ElevenLabs IDs
      config.conversation_config.agent.prompt.knowledge_base = elevenlabsKnowledgeBases.map((kb: any) => ({
        id: kb.elevenlabsId || kb.id, // Use the ElevenLabs-generated ID
        type: kb.type,
        name: kb.name,
        usage_mode: kb.usage_mode || 'auto'
      }));
    }

    console.log('2025 ElevenLabs Config:', JSON.stringify(config, null, 2));
    
    return config;
  }

  // ===== CUSTOM TOOLS API METHODS =====

  // Create custom tool
  async createCustomTool(toolConfig: any): Promise<any> {
    try {
      const response = await this.makeRequest('/convai/tools', {
        method: 'POST',
        body: JSON.stringify(toolConfig),
      });

      return response;
    } catch (error) {
      console.error('Failed to create custom tool:', error);
      throw error;
    }
  }

  // Update custom tool
  async updateCustomTool(toolId: string, toolConfig: any): Promise<any> {
    try {
      const response = await this.makeRequest(`/convai/tools/${toolId}`, {
        method: 'PATCH',
        body: JSON.stringify(toolConfig),
      });

      return response;
    } catch (error) {
      console.error(`Failed to update custom tool ${toolId}:`, error);
      throw error;
    }
  }

  // Delete custom tool
  async deleteCustomTool(toolId: string): Promise<void> {
    try {
      await this.makeRequest(`/convai/tools/${toolId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error(`Failed to delete custom tool ${toolId}:`, error);
      throw error;
    }
  }

  // Get custom tool details
  async getCustomTool(toolId: string): Promise<any> {
    try {
      return await this.makeRequest(`/convai/tools/${toolId}`);
    } catch (error) {
      console.error(`Failed to get custom tool ${toolId}:`, error);
      throw error;
    }
  }

  // Get all custom tools
  async getCustomTools(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/convai/tools');
      return response.tools || [];
    } catch (error) {
      console.error('Failed to get custom tools:', error);
      throw error;
    }
  }
}

export const elevenlabsAgentService = new ElevenLabsAgentService();