import { firestore } from '../../../config/firebase';
import { retrieveAgentConfigsService } from '../analysisCycle/retrieveAgentConfigs';
import { SystemPromptService } from '../../../agents/agentManagement/services/systemPromptService';

interface CreateTestAgentParams {
  originalAgentId: string;
  tenantId: string;
  sessionId: string;
}

interface TestAgentConfig {
  // Original agent reference
  originalAgentId: string;
  
  // Core agent info
  agentName: string;
  status: string;
  description?: string;
  
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
  
  // Training-specific metadata
  configVersion: number;
  createdAt: string;
  lastModified: string;
  appliedSuggestions: Array<{
    cycleId: string;
    appliedAt: string;
    changes: any;
  }>;
  configHistory: Array<{
    version: number;
    timestamp: string;
    changes: any;
    reason: string;
  }>;
}

interface CreateTestAgentResult {
  success: boolean;
  testAgentConfig?: TestAgentConfig;
  error?: string;
}

/**
 * Service for creating isolated test agent configurations for training sessions
 * Copies the original agent's complete configuration into the training session subcollection
 */
export class CreateTestAgentService {
  /**
   * Create a test agent configuration by copying the original agent's settings
   */
  async createTestAgent(params: CreateTestAgentParams): Promise<CreateTestAgentResult> {
    try {
      const { originalAgentId, tenantId, sessionId } = params;
      const timestamp = new Date().toISOString();
      
      console.log(`📋 Creating test agent copy for training session: ${sessionId}`);
      console.log(`  - Original Agent ID: ${originalAgentId}`);
      console.log(`  - Tenant ID: ${tenantId}`);

      // Step 1: Retrieve complete agent configuration
      console.log('  📥 Step 1: Retrieving original agent configuration...');
      const configResult = await retrieveAgentConfigsService.getAgentConfigs({
        tenantId,
        agentId: originalAgentId
      });

      if (!configResult.success || !configResult.configs) {
        console.error('❌ Failed to retrieve agent configurations:', configResult.error);
        return {
          success: false,
          error: `Failed to retrieve agent configurations: ${configResult.error}`
        };
      }

      const originalConfig = configResult.configs;
      console.log(`  ✅ Retrieved configuration for agent: ${originalConfig.agentName}`);

      // Step 1.5: Get the actual system prompt from Firestore (not the templated one)
      console.log('  📝 Step 1.5: Retrieving actual system prompt...');
      let actualSystemPrompt = '';
      try {
        const systemPromptService = new SystemPromptService();
        actualSystemPrompt = await systemPromptService.getSystemPrompt(tenantId, originalAgentId);
        console.log(`  ✅ Retrieved actual system prompt: ${actualSystemPrompt ? 'Available (' + actualSystemPrompt.length + ' chars)' : 'Not set'}`);
      } catch (error) {
        console.warn('  ⚠️ Failed to retrieve system prompt from Firestore, using config value:', error);
        actualSystemPrompt = originalConfig.systemPrompt || '';
      }

      // Step 2: Build test agent configuration
      console.log('  🔧 Step 2: Building test agent configuration...');
      const testAgentConfig: TestAgentConfig = {
        // Original reference
        originalAgentId,
        
        // Core agent info
        agentName: originalConfig.agentName,
        status: originalConfig.status,
        description: `Training copy of ${originalConfig.agentName}`,
        
        // ElevenLabs integration
        elevenLabsAgentId: originalConfig.elevenLabsAgentId,
        
        // LLM and conversation settings - use actual system prompt from Firestore
        systemPrompt: actualSystemPrompt,
        llmModel: originalConfig.llmModel,
        language: originalConfig.language,
        temperature: originalConfig.temperature,
        maxTokens: originalConfig.maxTokens,
        firstMessage: originalConfig.firstMessage,
        
        // Voice settings
        voiceSettings: originalConfig.voiceSettings ? {
          model_id: originalConfig.voiceSettings.model_id,
          speed: originalConfig.voiceSettings.speed,
          stability: originalConfig.voiceSettings.stability,
          similarity_boost: originalConfig.voiceSettings.similarity_boost,
          optimize_streaming_latency: originalConfig.voiceSettings.optimize_streaming_latency
        } : undefined,
        
        // Knowledge base
        knowledgeBase: originalConfig.knowledgeBase ? [...originalConfig.knowledgeBase] : undefined,
        ragSettings: originalConfig.ragSettings ? {
          enabled: originalConfig.ragSettings.enabled,
          maxDocuments: originalConfig.ragSettings.maxDocuments,
          threshold: originalConfig.ragSettings.threshold
        } : undefined,
        
        // Tools (deep copy to prevent mutations)
        builtInTools: originalConfig.builtInTools ? JSON.parse(JSON.stringify(originalConfig.builtInTools)) : undefined,
        customTools: originalConfig.customTools ? JSON.parse(JSON.stringify(originalConfig.customTools)) : undefined,
        mcpServerIds: originalConfig.mcpServerIds ? [...originalConfig.mcpServerIds] : undefined,
        
        // Advanced settings
        turnSettings: originalConfig.turnSettings ? {
          mode: originalConfig.turnSettings.mode,
          turn_timeout: originalConfig.turnSettings.turn_timeout,
          silence_end_call_timeout: originalConfig.turnSettings.silence_end_call_timeout
        } : undefined,
        
        asrSettings: originalConfig.asrSettings ? {
          provider: originalConfig.asrSettings.provider,
          quality: originalConfig.asrSettings.quality,
          user_input_audio_format: originalConfig.asrSettings.user_input_audio_format,
          keywords: originalConfig.asrSettings.keywords ? [...originalConfig.asrSettings.keywords] : undefined
        } : undefined,
        
        // Training-specific metadata
        configVersion: 1,
        createdAt: timestamp,
        lastModified: timestamp,
        appliedSuggestions: [],
        configHistory: [{
          version: 1,
          timestamp,
          changes: null,
          reason: 'Initial training session creation - copied from original agent'
        }]
      };

      console.log(`  ✅ Test agent configuration built`);
      console.log(`    - Agent Name: ${testAgentConfig.agentName}`);
      console.log(`    - System Prompt: ${testAgentConfig.systemPrompt ? 'Available (' + testAgentConfig.systemPrompt.length + ' chars)' : 'Not set'}`);
      console.log(`    - LLM Model: ${testAgentConfig.llmModel}`);
      console.log(`    - Temperature: ${testAgentConfig.temperature}`);
      console.log(`    - Knowledge Base Sources: ${testAgentConfig.knowledgeBase?.length || 0}`);
      console.log(`    - Built-in Tools: ${Object.keys(testAgentConfig.builtInTools || {}).length}`);
      
      // Debug comparison
      console.log(`  🔍 Debug - Config Source Comparison:`);
      console.log(`    - Original Config System Prompt: ${originalConfig.systemPrompt ? 'Available (' + originalConfig.systemPrompt.length + ' chars)' : 'Not set'}`);
      console.log(`    - Firestore System Prompt: ${actualSystemPrompt ? 'Available (' + actualSystemPrompt.length + ' chars)' : 'Not set'}`);
      console.log(`    - Using: ${testAgentConfig.systemPrompt === actualSystemPrompt ? 'Firestore' : 'Original Config'}`);

      // Step 3: Save test agent to subcollection
      console.log('  💾 Step 3: Saving test agent to subcollection...');
      
      // Create test agent document in subcollection
      const testAgentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('testAgent')
        .doc(originalAgentId);

      await testAgentRef.set(testAgentConfig);

      // Update session metadata to indicate training mode
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      await sessionRef.update({
        isTrainingMode: true,
        testAgentCreatedAt: timestamp,
        lastModified: timestamp
      });

      console.log(`  ✅ Test agent saved to subcollection`);
      console.log(`    - Path: /testAgent/${originalAgentId}`);
      console.log(`    - Config Version: ${testAgentConfig.configVersion}`);

      console.log('🎉 Test agent creation completed successfully!');

      return {
        success: true,
        testAgentConfig
      };

    } catch (error: any) {
      console.error('❌ Error creating test agent:', error);
      
      return {
        success: false,
        error: `Failed to create test agent: ${error.message}`
      };
    }
  }

  /**
   * Update test agent configuration with new settings
   */
  async updateTestAgentConfig(
    tenantId: string,
    sessionId: string,
    originalAgentId: string,
    configChanges: Partial<TestAgentConfig>,
    reason: string
  ): Promise<CreateTestAgentResult> {
    try {
      const timestamp = new Date().toISOString();
      
      console.log(`🔄 Updating test agent configuration: ${sessionId}`);
      console.log(`  - Changes: ${Object.keys(configChanges).join(', ')}`);
      console.log(`  - Reason: ${reason}`);

      // Get current test agent config from subcollection
      const testAgentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('testAgent')
        .doc(originalAgentId);

      const testAgentDoc = await testAgentRef.get();
      if (!testAgentDoc.exists) {
        throw new Error('Test agent configuration not found in subcollection');
      }

      const currentConfig = testAgentDoc.data() as TestAgentConfig;

      // Merge changes with current config
      const updatedConfig: TestAgentConfig = {
        ...currentConfig,
        ...configChanges,
        configVersion: currentConfig.configVersion + 1,
        lastModified: timestamp,
        configHistory: [
          ...currentConfig.configHistory,
          {
            version: currentConfig.configVersion + 1,
            timestamp,
            changes: configChanges,
            reason
          }
        ]
      };

      // Save updated config
      await testAgentRef.set(updatedConfig);

      // Update session metadata
      const sessionRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId);

      await sessionRef.update({
        lastModified: timestamp
      });

      console.log(`  ✅ Test agent configuration updated to version ${updatedConfig.configVersion}`);

      return {
        success: true,
        testAgentConfig: updatedConfig
      };

    } catch (error: any) {
      console.error('❌ Error updating test agent config:', error);
      
      return {
        success: false,
        error: `Failed to update test agent config: ${error.message}`
      };
    }
  }

  /**
   * Get test agent configuration from subcollection
   */
  async getTestAgentConfig(
    tenantId: string,
    sessionId: string,
    originalAgentId: string
  ): Promise<CreateTestAgentResult> {
    try {
      console.log(`📖 Retrieving test agent configuration: ${sessionId}`);

      const testAgentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('testAgent')
        .doc(originalAgentId);

      const testAgentDoc = await testAgentRef.get();
      if (!testAgentDoc.exists) {
        return {
          success: false,
          error: 'Test agent configuration not found in subcollection'
        };
      }

      const testAgentConfig = testAgentDoc.data() as TestAgentConfig;

      console.log(`  ✅ Retrieved test agent config version ${testAgentConfig.configVersion}`);

      return {
        success: true,
        testAgentConfig
      };

    } catch (error: any) {
      console.error('❌ Error retrieving test agent config:', error);
      
      return {
        success: false,
        error: `Failed to retrieve test agent config: ${error.message}`
      };
    }
  }

  /**
   * Check if training session has test agent configuration
   */
  async hasTestAgent(
    tenantId: string,
    sessionId: string,
    originalAgentId: string
  ): Promise<boolean> {
    try {
      const testAgentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('trainingSessions')
        .doc(sessionId)
        .collection('testAgent')
        .doc(originalAgentId);

      const testAgentDoc = await testAgentRef.get();
      return testAgentDoc.exists;

    } catch (error) {
      console.error('Error checking test agent existence:', error);
      return false;
    }
  }
}

export const createTestAgentService = new CreateTestAgentService();