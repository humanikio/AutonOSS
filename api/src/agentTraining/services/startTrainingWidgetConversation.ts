import { firestore } from '../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { getTrainingConfigs } from './publishTrainingConfigs/getConfigs';

interface StartTrainingWidgetConversationParams {
  tenantId: string;
  agentId: string;
  sessionId: string;
}

interface StartTrainingWidgetConversationResult {
  sessionId: string;
  agentId: string;
  elevenLabsAgentId: string;
  systemPrompt: string;
  trainingSessionId: string;
}

export const startTrainingWidgetConversationService = async (
  params: StartTrainingWidgetConversationParams
): Promise<StartTrainingWidgetConversationResult> => {
  const { tenantId, agentId, sessionId } = params;

  try {
    console.log(`[${tenantId}] Starting training widget conversation for agent ${agentId} in training session ${sessionId}`);
    
    // Use the same service as the publish modal to get training configurations
    console.log('📋 Getting training configurations (same as publish modal)...');
    const configResult = await getTrainingConfigs({
      tenantId,
      sessionId,
      agentId
    });

    if (!configResult.success || !configResult.config) {
      console.error('❌ Failed to retrieve training configuration:', configResult.error);
      throw new Error(`Failed to retrieve training configuration: ${configResult.error}`);
    }

    const trainingConfig = configResult.config;
    console.log(`✅ Retrieved training configuration`);
    console.log(`  - Config Version: ${trainingConfig.configVersion}`);
    console.log(`  - System Prompt: ${trainingConfig.systemPrompt ? 'Available (' + trainingConfig.systemPrompt.length + ' chars)' : 'Not set'}`);

    // Get ElevenLabs agent ID from the training config
    let elevenLabsAgentId = trainingConfig.elevenLabsAgentId;
    
    // If training config doesn't have ElevenLabs ID, fall back to main agent
    if (!elevenLabsAgentId) {
      console.log('Training config missing ElevenLabs ID, falling back to main agent');
      const mainAgentRef = firestore
        .collection('tenants')
        .doc(tenantId)
        .collection('agents')
        .doc(agentId);
      
      const mainAgentDoc = await mainAgentRef.get();
      if (!mainAgentDoc.exists) {
        throw new Error('Main agent not found');
      }
      
      const mainAgentData = mainAgentDoc.data();
      elevenLabsAgentId = mainAgentData?.elevenLabsAgentId;
      
      if (!elevenLabsAgentId) {
        throw new Error('ElevenLabs agent ID not found in main agent either');
      }
    }

    // Use the training configuration's system prompt (which contains all training improvements)
    const systemPrompt = trainingConfig.systemPrompt || 'You are a helpful business assistant.';

    // Generate a unique widget session ID
    const widgetSessionId = uuidv4();

    console.log(`✅ Using training configuration system prompt: ${systemPrompt.length} chars`);
    console.log(`✅ Training config version: ${trainingConfig.configVersion}`);
    console.log(`✅ Applied suggestions: ${trainingConfig.appliedSuggestions?.length || 0}`);
    
    // Save widget session data to Firestore
    const widgetSessionRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('widgetSessions')
      .doc(widgetSessionId);
    
    await widgetSessionRef.set({
      sessionId: widgetSessionId,
      agentId,
      elevenLabsAgentId,
      tenantId,
      systemPrompt,
      trainingSessionId: sessionId,
      trainingConfig: {
        version: trainingConfig.configVersion,
        temperature: trainingConfig.temperature,
        maxTokens: trainingConfig.maxTokens,
        firstMessage: trainingConfig.firstMessage,
        lastModified: trainingConfig.lastModified,
        appliedSuggestions: trainingConfig.appliedSuggestions?.length || 0
      },
      startedAt: new Date().toISOString(),
      type: 'training-test',
      status: 'active'
    });

    console.log(`🎉 Training widget conversation started successfully`);
    console.log(`  - Widget Session ID: ${widgetSessionId}`);
    console.log(`  - Using training config version: ${trainingConfig.configVersion}`);

    return {
      sessionId: widgetSessionId,
      agentId,
      elevenLabsAgentId,
      systemPrompt,
      trainingSessionId: sessionId
    };

  } catch (error) {
    console.error(`[${tenantId}] Error starting training widget conversation:`, error);
    throw new Error('Failed to start training widget conversation');
  }
};