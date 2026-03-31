import axios from 'axios';
import { ConnectedAgent } from './findConnectedAgents';

export interface AgentKnowledgeBaseItem {
  id: string;
  type: 'file' | 'url' | 'text';
}

export interface AgentUpdateRequest {
  conversation_config: {
    agent: {
      prompt: {
        prompt?: string;
        llm?: string;
        knowledge_base: AgentKnowledgeBaseItem[];
      };
    };
  };
}

export interface ConnectToExistingAgentsResult {
  success: boolean;
  updatedAgents: string[];
  failedAgents: { agentId: string; error: string; }[];
  message: string;
}

/**
 * Connect existing agents to a new document by replacing old document ID with new document ID
 */
export async function connectToExistingAgents(
  connectedAgents: ConnectedAgent[],
  oldDocumentId: string,
  newDocumentId: string
): Promise<ConnectToExistingAgentsResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  }

  console.log(`Connecting ${connectedAgents.length} agents to new document ${newDocumentId}, replacing old document ${oldDocumentId}`);

  const updatedAgents: string[] = [];
  const failedAgents: { agentId: string; error: string; }[] = [];

  for (const agent of connectedAgents) {
    try {
      console.log(`Updating agent ${agent.name} (${agent.id})...`);
      
      // Skip agents with undefined or missing id
      if (!agent.id) {
        console.warn(`Skipping agent ${agent.name} - missing id:`, agent);
        failedAgents.push({
          agentId: agent.id || 'unknown',
          error: 'Missing agent id field'
        });
        continue;
      }

      // First, get the current agent configuration
      const getResponse = await axios.get(
        `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
        {
          headers: {
            'xi-api-key': apiKey
          },
          timeout: 30000
        }
      );

      if (getResponse.status !== 200) {
        throw new Error(`Failed to get agent config: ${getResponse.status} ${getResponse.statusText}`);
      }

      const currentConfig = getResponse.data;
      
      // Extract current knowledge base items
      const currentKnowledgeBase = currentConfig?.conversation_config?.agent?.prompt?.knowledge_base || [];
      
      console.log(`Current knowledge base for agent ${agent.id}:`, currentKnowledgeBase);

      // Replace old document ID with new document ID
      const updatedKnowledgeBase = currentKnowledgeBase.map((item: AgentKnowledgeBaseItem) => {
        if (item.id === oldDocumentId) {
          console.log(`Replacing document ID ${oldDocumentId} with ${newDocumentId} in agent ${agent.id}`);
          return {
            ...item,
            id: newDocumentId
          };
        }
        return item;
      });

      // Prepare update payload with the updated knowledge base
      const updatePayload: AgentUpdateRequest = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: currentConfig?.conversation_config?.agent?.prompt?.prompt,
              llm: currentConfig?.conversation_config?.agent?.prompt?.llm,
              knowledge_base: updatedKnowledgeBase
            }
          }
        }
      };

      console.log(`Updating agent ${agent.id} with new knowledge base:`, updatedKnowledgeBase);

      // Update the agent
      const updateResponse = await axios.patch(
        `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
        updatePayload,
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (updateResponse.status !== 200) {
        throw new Error(`Failed to update agent: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      console.log(`Successfully updated agent ${agent.name} (${agent.id})`);
      
      // Verify the update by fetching the agent again to confirm the document ID was changed
      // Add retry logic since 11Labs has eventual consistency
      console.log(`Verifying agent ${agent.id} was updated correctly...`);
      let verificationAttempt = 0;
      const maxVerificationAttempts = 3;
      let verified = false;
      
      while (verificationAttempt < maxVerificationAttempts && !verified) {
        if (verificationAttempt > 0) {
          console.log(`Verification attempt ${verificationAttempt + 1}/${maxVerificationAttempts} - waiting 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const verifyResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`,
          {
            headers: {
              'xi-api-key': apiKey
            }
          }
        );
        
        const verifiedKnowledgeBase = verifyResponse.data?.conversation_config?.agent?.prompt?.knowledge_base || [];
        const hasNewDocument = verifiedKnowledgeBase.some((item: AgentKnowledgeBaseItem) => item.id === newDocumentId);
        const hasOldDocument = verifiedKnowledgeBase.some((item: AgentKnowledgeBaseItem) => item.id === oldDocumentId);
        
        console.log(`Verification attempt ${verificationAttempt + 1}: hasNew=${hasNewDocument}, hasOld=${hasOldDocument}`);
        
        if (hasNewDocument && !hasOldDocument) {
          console.log(`✅ Verified: Agent ${agent.id} successfully updated with new document ${newDocumentId}`);
          verified = true;
        } else if (hasNewDocument && hasOldDocument) {
          console.warn(`⚠️  Warning: Agent ${agent.id} has both old and new documents in knowledge base`);
          verified = true; // This is acceptable - the new document is there
        } else if (verificationAttempt === maxVerificationAttempts - 1) {
          // Only fail on the final attempt
          console.error(`❌ Error: Agent ${agent.id} update failed after ${maxVerificationAttempts} attempts - new document ${newDocumentId} not found`);
          console.log('Current knowledge base:', JSON.stringify(verifiedKnowledgeBase, null, 2));
          throw new Error(`Agent update verification failed after ${maxVerificationAttempts} attempts - new document not found in knowledge base`);
        }
        
        verificationAttempt++;
      }
      
      updatedAgents.push(agent.id);

    } catch (error) {
      console.error(`Failed to update agent ${agent.name} (${agent.id}):`, error);
      
      let errorMessage = 'Unknown error';
      if (axios.isAxiosError(error)) {
        errorMessage = `API error (${error.response?.status}): ${error.response?.statusText || error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      failedAgents.push({
        agentId: agent.id,
        error: errorMessage
      });
    }
  }

  const success = failedAgents.length === 0;
  let message = '';

  if (success) {
    message = `Successfully updated all ${updatedAgents.length} agents with new document ID`;
  } else if (updatedAgents.length > 0) {
    message = `Updated ${updatedAgents.length} agents successfully, but ${failedAgents.length} failed`;
  } else {
    message = `Failed to update all ${failedAgents.length} agents`;
  }

  console.log(message);

  if (failedAgents.length > 0) {
    console.error('Failed agents:', failedAgents);
  }

  return {
    success,
    updatedAgents,
    failedAgents,
    message
  };
}

/**
 * Helper function to validate agent update payload
 */
export function validateAgentUpdatePayload(payload: AgentUpdateRequest): boolean {
  if (!payload.conversation_config?.agent?.prompt?.knowledge_base) {
    return false;
  }

  // Validate each knowledge base item
  for (const item of payload.conversation_config.agent.prompt.knowledge_base) {
    if (!item.id || !item.type) {
      return false;
    }
    
    if (!['file', 'url', 'text'].includes(item.type)) {
      return false;
    }
  }

  return true;
}