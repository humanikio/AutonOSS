interface ElevenLabsAgentResponse {
  agent_id: string;
}

interface ElevenLabsCreateAgentRequest {
  conversation_config: {};
  name?: string;
  personalization?: {
    dynamic_variables?: {
      [key: string]: string;
    };
  };
}

export async function createElevenLabsAgent(tenantId: string, agentId: string): Promise<string> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    const agentName = `${tenantId}-${agentId}`;
    
    const requestBody: ElevenLabsCreateAgentRequest = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: `{{systemPrompt}}

IMPORTANT: If there is information present below, please consider this heavily in the logic of the agent, as this will be extra instructions that MUST be invoked or taken heavily into consideration when determining the way the agent will speak on the phone, perhaps changing the purpose of the call, the objective, etc.

Action Context (if any):
{{actionContext}}`
          }
        }
      },
      name: agentName,
      personalization: {
        dynamic_variables: {
          systemPrompt: "You are a helpful AI assistant. Please be professional and courteous in all interactions.",
          actionContext: "general"
        }
      }
    };

    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as ElevenLabsAgentResponse;
    
    console.log(`Successfully created ElevenLabs agent with ID: ${data.agent_id} and name: ${agentName}`);
    
    return data.agent_id;
  } catch (error) {
    console.error('Error creating ElevenLabs agent:', error);
    throw new Error(`Failed to create ElevenLabs agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}