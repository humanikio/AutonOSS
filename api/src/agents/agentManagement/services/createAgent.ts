import { createNewFirestoreAgentCard } from './createAgent/createNewFirestroreAgentCard';
import { createElevenLabsAgent } from './createAgent/11LabsCreateAgent';
import { updateAgentConfig } from './updateAgentConfig';
import { v4 as uuidv4 } from 'uuid';

interface BotAvatar {
  color: string;
  entityImagePath: string;
  iconImagePath: string;
}

export async function createAgentService(tenantId: string, name: string, selectedAvatar?: BotAvatar): Promise<string> {
  try {
    // Generate a unique agent ID using UUID first
    const agentId = uuidv4();
    
    // Create the agent in ElevenLabs with tenantId-agentId format
    const elevenLabsAgentId = await createElevenLabsAgent(tenantId, agentId);
    
    // Then create the agent card in Firestore with the existing agentId and ElevenLabs agent ID
    await createNewFirestoreAgentCard(tenantId, name, agentId, elevenLabsAgentId, selectedAvatar);
    
    // Configure the agent with default built-in tools
    console.log(`🔧 Setting up default configuration for agent: ${agentId}`);
    const defaultBuiltInTools = {
      end_call: {
        name: 'end_call',
        description: 'Gives agent the ability to end the call with the user.'
      },
      language_detection: {
        name: 'language_detection', 
        description: 'Gives agent the ability to change the language during conversation.'
      }
    };
    
    await updateAgentConfig({
      tenantId,
      agentId,
      elevenLabsAgentId,
      updates: {
        built_in_tools: defaultBuiltInTools
      }
    });
    
    console.log(`✅ Successfully created and configured agent: ${agentId} with default tools`);
    
    return agentId;
  } catch (error) {
    console.error('Error in createAgentService:', error);
    throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}