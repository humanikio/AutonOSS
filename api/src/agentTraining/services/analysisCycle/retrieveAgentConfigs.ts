import { getAgentsService } from '../../../agents/agentManagement/services/getAgents';
import { firestore } from '../../../config/firebase';

/**
 * Service for retrieving agent configurations for analysis
 * Uses existing agent management services to get comprehensive agent config
 */

export interface AgentConfigRequest {
  tenantId: string;
  agentId: string;
  sessionId?: string; // For training mode - to get test agent configs
}

export interface AgentConfigs {
  // Core agent info
  agentId: string;
  agentName: string;
  status: string;
  
  // ElevenLabs integration
  elevenLabsAgentId?: string;
  
  // System prompt and LLM settings
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
  
  // Knowledge base and RAG
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
  
  // Tools and integrations
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
}

export interface AgentConfigResult {
  success: boolean;
  configs?: AgentConfigs;
  error?: string;
}

export class RetrieveAgentConfigsService {
  /**
   * Get comprehensive agent configuration using existing services
   */
  async getAgentConfigs(request: AgentConfigRequest): Promise<AgentConfigResult> {
    try {
      const { tenantId, agentId, sessionId } = request;
      
      console.log(`� Retrieving agent configurations: ${agentId}`);

      // Step 1: Get basic agent info using existing service
      console.log('  " Step 1: Fetching basic agent information...');
      const agentsResult = await getAgentsService(tenantId);
      const agent = agentsResult.find(a => a.id === agentId);
      
      if (!agent) {
        console.error(`L Agent not found: ${agentId}`);
        return {
          success: false,
          error: `Agent not found: ${agentId}`
        };
      }

      console.log(`   Found agent: ${agent.name} (${agent.status})`);

      // Step 2: Get detailed agent configuration from Firestore (training mode aware)
      console.log('  📋 Step 2: Fetching detailed agent configuration...');
      
      let agentDoc;
      let isUsingTestAgent = false;
      
      // Check for test agent configuration if in training mode
      if (sessionId) {
        console.log('  🧪 Training mode: Checking for test agent configuration...');
        try {
          const testAgentDoc = await firestore
            .collection('tenants').doc(tenantId)
            .collection('trainingSessions').doc(sessionId)
            .collection('testAgent').doc(agentId)
            .get();
          
          if (testAgentDoc.exists) {
            console.log('  ✅ Using test agent configuration from training session');
            agentDoc = testAgentDoc;
            isUsingTestAgent = true;
          } else {
            console.log('  ⚠️ Test agent not found, falling back to live agent configuration');
          }
        } catch (error) {
          console.warn('  ⚠️ Error loading test agent, falling back to live agent:', error);
        }
      }
      
      // Fallback to live agent configuration if not using test agent
      if (!agentDoc) {
        console.log(sessionId ? '  🔄 Using live agent configuration as fallback' : '  🔴 Production mode: Using live agent configuration');
        agentDoc = await firestore
          .collection('tenants')
          .doc(tenantId)
          .collection('agents')
          .doc(agentId)
          .get();
      }

      if (!agentDoc.exists) {
        console.error(`L Agent document not found in Firestore: ${agentId}`);
        return {
          success: false,
          error: `Agent document not found: ${agentId}`
        };
      }

      const agentData = agentDoc.data()!;
      
      if (isUsingTestAgent) {
        console.log('  🔍 Debug - Test agent data structure:', {
          hasSystemPrompt: !!agentData.systemPrompt,
          hasPrompt: !!agentData.prompt,
          hasLlmSettings: !!agentData.llmSettings,
          hasAgentName: !!agentData.agentName,
          hasName: !!agentData.name,
          systemPromptValue: agentData.systemPrompt || 'NOT FOUND'
        });
      }
      console.log(`   Retrieved detailed agent configuration`);

      // Step 3: Format configuration for analysis
      console.log('  " Step 3: Formatting configuration for analysis...');
      
      const configs: AgentConfigs = {
        // Core info
        agentId: agentId,
        agentName: agent.name || agentData.name || 'Unnamed Agent',
        status: agent.status || agentData.status || 'draft',
        
        // ElevenLabs integration
        elevenLabsAgentId: agentData.elevenLabsAgentId,
        
        // LLM and conversation settings - check prompt field first, then llmSettings.prompt
        systemPrompt: isUsingTestAgent ?
          (agentData.systemPrompt || agentData.prompt || agentData.llmSettings?.prompt) :
          (agentData.prompt || agentData.llmSettings?.prompt || agentData.systemPrompt),
        llmModel: agentData.llmSettings?.llm || 'gemini-2.0-flash',
        language: agentData.agentSettings?.language || agentData.language || 'en',
        temperature: agentData.llmSettings?.temperature ?? 0,
        maxTokens: agentData.llmSettings?.max_tokens ?? -1,
        firstMessage: agentData.agentSettings?.first_message || agentData.firstMessage,
        
        // Voice settings
        voiceSettings: {
          model_id: agentData.voiceSettings?.model_id || 'eleven_turbo_v2_5',
          speed: agentData.voiceSettings?.speed ?? 1.0,
          stability: agentData.voiceSettings?.stability ?? 0.5,
          similarity_boost: agentData.voiceSettings?.similarity_boost ?? 0.8,
          optimize_streaming_latency: agentData.voiceSettings?.optimize_streaming_latency ?? 0
        },
        
        // Knowledge base
        knowledgeBase: this.formatKnowledgeBase(agentData.knowledgeBase || []),
        ragSettings: {
          enabled: !!(agentData.ragSettings?.enabled || agentData.knowledgeBase?.length > 0),
          maxDocuments: agentData.ragSettings?.maxDocuments || 5,
          threshold: agentData.ragSettings?.threshold || 0.7
        },
        
        // Tools
        builtInTools: agentData.builtInTools || {},
        customTools: agentData.customTools || [],
        mcpServerIds: agentData.mcpServerIds || [],
        
        // Advanced settings
        turnSettings: agentData.turnSettings ? {
          mode: agentData.turnSettings.mode || 'silence',
          turn_timeout: agentData.turnSettings.turn_timeout ?? 7,
          silence_end_call_timeout: agentData.turnSettings.silence_end_call_timeout ?? -1
        } : undefined,
        
        asrSettings: agentData.asrSettings ? {
          provider: agentData.asrSettings.provider || 'elevenlabs',
          quality: agentData.asrSettings.quality || 'high',
          user_input_audio_format: agentData.asrSettings.user_input_audio_format || 'pcm_16000',
          keywords: agentData.asrSettings.keywords || []
        } : undefined
      };

      // Step 4: Log configuration summary
      console.log('  =� Configuration summary:');
      console.log(`    - System prompt: ${configs.systemPrompt ? `${configs.systemPrompt.length} chars` : 'Not set'}`);
      console.log(`    - LLM Model: ${configs.llmModel}`);
      console.log(`    - Language: ${configs.language}`);
      console.log(`    - Temperature: ${configs.temperature}`);
      console.log(`    - Knowledge base docs: ${configs.knowledgeBase?.length || 0}`);
      console.log(`    - RAG enabled: ${configs.ragSettings?.enabled ? 'Yes' : 'No'}`);
      console.log(`    - Built-in tools: ${Object.keys(configs.builtInTools || {}).length}`);
      console.log(`    - Custom tools: ${configs.customTools?.length || 0}`);

      console.log(' Agent configurations retrieved successfully');

      return {
        success: true,
        configs
      };

    } catch (error) {
      console.error('L Error retrieving agent configs:', error);
      
      return {
        success: false,
        error: `Failed to retrieve agent configs: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Format knowledge base data for analysis
   */
  private formatKnowledgeBase(knowledgeBase: any[]): Array<{ id: string; name: string; type: string; documentCount?: number }> {
    if (!Array.isArray(knowledgeBase)) {
      return [];
    }

    return knowledgeBase.map((kb: any) => ({
      id: kb.id || kb.indexId || 'unknown',
      name: kb.name || kb.displayName || 'Unnamed Knowledge Base',
      type: kb.type || 'document',
      documentCount: kb.documentCount || kb.documents?.length || undefined
    }));
  }

  /**
   * Get agent configuration summary for quick analysis
   */
  async getConfigSummary(tenantId: string, agentId: string): Promise<{
    success: boolean;
    summary?: string;
    error?: string;
  }> {
    try {
      const configResult = await this.getAgentConfigs({ tenantId, agentId });
      
      if (!configResult.success || !configResult.configs) {
        return {
          success: false,
          error: configResult.error
        };
      }

      const config = configResult.configs;
      
      const summary = `Agent Configuration Summary:
" Agent: ${config.agentName} (${config.status})
" System Prompt: ${config.systemPrompt ? 'Set' : 'Not set'} ${config.systemPrompt ? `(${config.systemPrompt.length} chars)` : ''}
" LLM: ${config.llmModel} (Temperature: ${config.temperature})
" Language: ${config.language}
" Knowledge Base: ${config.knowledgeBase?.length || 0} sources${config.ragSettings?.enabled ? ' (RAG enabled)' : ''}
" Tools: ${Object.keys(config.builtInTools || {}).length} built-in, ${config.customTools?.length || 0} custom
" Voice Model: ${config.voiceSettings?.model_id} (Speed: ${config.voiceSettings?.speed}x)`;

      return {
        success: true,
        summary
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to generate config summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const retrieveAgentConfigsService = new RetrieveAgentConfigsService();