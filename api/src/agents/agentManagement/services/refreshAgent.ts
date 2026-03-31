import { get11LabsAgentConfig } from './refreshAgent/get11LabsAgentConfig';
import { updateFirestoreRecords } from './refreshAgent/updateFirestoreRecords';

export interface RefreshAgentParams {
  tenantId: string;
  agentId: string;
  elevenLabsAgentId: string;
}

export interface RefreshAgentResult {
  success: boolean;
  message: string;
  updatedFields: string[];
  elevenLabsAgentId: string;
  elevenLabsAgentName?: string;
}

export async function refreshAgent(params: RefreshAgentParams): Promise<RefreshAgentResult> {
  try {
    const { tenantId, agentId, elevenLabsAgentId } = params;
    
    console.log(`= Starting agent refresh for agent: ${agentId} (11Labs: ${elevenLabsAgentId})`);
    
    // Step 1: Get current configuration from 11Labs
    console.log('=á Step 1: Fetching current 11Labs agent configuration...');
    const elevenLabsConfig = await get11LabsAgentConfig(elevenLabsAgentId);
    
    console.log(` Retrieved config for: ${elevenLabsConfig.name} (${elevenLabsConfig.agent_id})`);
    
    // Step 2: Update Firestore with the latest configuration
    console.log('=¾ Step 2: Updating Firestore records with latest configuration...');
    await updateFirestoreRecords(tenantId, agentId, elevenLabsConfig);
    
    console.log(` Successfully refreshed agent: ${agentId}`);
    
    // Determine what fields were updated (for reporting purposes)
    const updatedFields = [
      'lastRefreshedAt',
      'updatedAt',
      'elevenLabsFullConfig'
    ];
    
    // Add conditional fields based on what was in the config
    if (elevenLabsConfig.conversation_config?.tts) {
      updatedFields.push('currentVoiceId', 'voiceSettings');
    }
    if (elevenLabsConfig.conversation_config?.asr) {
      updatedFields.push('asrSettings');
    }
    if (elevenLabsConfig.conversation_config?.turn) {
      updatedFields.push('turnSettings');
    }
    if (elevenLabsConfig.conversation_config?.conversation) {
      updatedFields.push('conversationSettings');
    }
    if (elevenLabsConfig.conversation_config?.agent) {
      updatedFields.push('agentSettings', 'llmSettings');
    }
    if (elevenLabsConfig.phone_numbers) {
      updatedFields.push('elevenLabsPhoneNumbers');
    }
    if (elevenLabsConfig.platform_settings) {
      updatedFields.push('platformSettings');
    }
    if (elevenLabsConfig.tags) {
      updatedFields.push('elevenLabsTags');
    }
    
    return {
      success: true,
      message: `Successfully refreshed agent configuration from 11Labs`,
      updatedFields,
      elevenLabsAgentId,
      elevenLabsAgentName: elevenLabsConfig.name
    };
    
  } catch (error) {
    console.error('L Error refreshing agent:', error);
    
    return {
      success: false,
      message: `Failed to refresh agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
      updatedFields: [],
      elevenLabsAgentId: params.elevenLabsAgentId
    };
  }
}