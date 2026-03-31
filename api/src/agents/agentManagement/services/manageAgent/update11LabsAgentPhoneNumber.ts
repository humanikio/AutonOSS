interface ElevenLabsPhoneNumberUpdateResponse {
  phone_number: string;
  label: string;
  supports_inbound: boolean;
  supports_outbound: boolean;
  phone_number_id: string;
  assigned_agent: {
    agent_id: string;
    agent_name: string;
  };
  provider: string;
}

interface ElevenLabsPhoneNumberUpdateRequest {
  agent_id: string;
}

export async function update11LabsAgentPhoneNumber(
  elevenLabsAgentId: string,
  elevenLabsPhoneNumberId: string
): Promise<void> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!elevenLabsAgentId) {
      throw new Error('ElevenLabs agent ID is required');
    }

    if (!elevenLabsPhoneNumberId) {
      throw new Error('ElevenLabs phone number ID is required');
    }

    // Update the phone number to point to the agent
    const requestBody: ElevenLabsPhoneNumberUpdateRequest = {
      agent_id: elevenLabsAgentId
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${elevenLabsPhoneNumberId}`, {
      method: 'PATCH',
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

    const data = await response.json() as ElevenLabsPhoneNumberUpdateResponse;
    
    console.log(`Successfully assigned phone number ${elevenLabsPhoneNumberId} to agent ${elevenLabsAgentId}`);
  } catch (error) {
    console.error('Error updating 11Labs phone number assignment:', error);
    throw new Error(`Failed to update 11Labs phone number assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}