interface ElevenLabsAgentUpdateResponse {
  agent_id: string;
  name: string;
  conversation_config: {
    asr?: any;
    turn?: any;
    tts: {
      model_id: string;
      voice_id: string;
      supported_voices?: any[];
      agent_output_audio_format?: string;
      optimize_streaming_latency?: number;
      stability?: number;
      speed?: number;
      similarity_boost?: number;
    };
    conversation?: any;
    language_presets?: any;
    agent?: any;
  };
  metadata?: any;
}

interface ElevenLabsAgentUpdateRequest {
  conversation_config: {
    tts: {
      voice_id: string;
      model_id?: string;
      stability?: number;
      speed?: number;
      similarity_boost?: number;
    };
  };
}

export async function update11LabsAgentVoice(
  elevenLabsAgentId: string,
  voiceId: string,
  voiceSettings?: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  }
): Promise<ElevenLabsAgentUpdateResponse> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!elevenLabsAgentId) {
      throw new Error('ElevenLabs agent ID is required');
    }

    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    // Prepare the update request
    const requestBody: ElevenLabsAgentUpdateRequest = {
      conversation_config: {
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_turbo_v2', // Default to turbo v2 for good performance
          ...(voiceSettings && {
            stability: voiceSettings.stability,
            speed: voiceSettings.speed,
            similarity_boost: voiceSettings.similarity_boost
          })
        }
      }
    };

    console.log(`Updating 11Labs agent ${elevenLabsAgentId} with voice ${voiceId}`);

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`, {
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

    const data = await response.json() as ElevenLabsAgentUpdateResponse;
    
    console.log(`Successfully updated 11Labs agent ${elevenLabsAgentId} with voice ${voiceId}`);
    
    return data;
  } catch (error) {
    console.error('Error updating 11Labs agent voice:', error);
    throw new Error(`Failed to update 11Labs agent voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}