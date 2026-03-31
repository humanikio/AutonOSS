// Updates 11Labs agent configuration via PATCH API call
export async function update11LabsAgent(elevenLabsAgentId: string, payload: any): Promise<void> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!elevenLabsAgentId) {
      throw new Error('ElevenLabs agent ID is required');
    }

    if (!payload || Object.keys(payload).length === 0) {
      throw new Error('Update payload is required');
    }

    console.log(`🚀 Updating 11Labs agent configuration for: ${elevenLabsAgentId}`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${elevenLabsAgentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('11Labs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Get the response data for logging
    const responseData = await response.json();
    
    console.log('✅ Successfully updated 11Labs agent configuration');
    console.log('📋 Response from 11Labs:', JSON.stringify(responseData, null, 2));
    
  } catch (error) {
    console.error('❌ Error updating 11Labs agent:', error);
    throw new Error(`Failed to update 11Labs agent configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}