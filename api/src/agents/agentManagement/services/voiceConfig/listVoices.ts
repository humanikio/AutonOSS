interface VoiceSettings {
  stability: number;
  use_speaker_boost: boolean;
  similarity_boost: number;
  style: number;
  speed: number;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: { [key: string]: string };
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: VoiceSettings;
  is_owner: boolean;
  is_legacy: boolean;
  is_mixed: boolean;
  created_at_unix: number;
}

interface ListVoicesResponse {
  voices: Voice[];
  has_more: boolean;
  total_count: number;
  next_page_token: string | null;
}

interface ListVoicesParams {
  search?: string;
  pageSize?: number;
  nextPageToken?: string;
  voiceType?: string;
  category?: string;
  sortDirection?: 'asc' | 'desc';
}

export async function listVoices(params: ListVoicesParams = {}): Promise<ListVoicesResponse> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.pageSize) queryParams.append('page_size', params.pageSize.toString());
    if (params.nextPageToken) queryParams.append('next_page_token', params.nextPageToken);
    if (params.voiceType) queryParams.append('voice_type', params.voiceType);
    if (params.category) queryParams.append('category', params.category);
    if (params.sortDirection) queryParams.append('sort_direction', params.sortDirection);
    
    // Default to 50 voices per page for better UX
    if (!params.pageSize) queryParams.append('page_size', '50');
    
    const url = `https://api.elevenlabs.io/v2/voices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as ListVoicesResponse;
    
    console.log(`Successfully retrieved ${data.voices.length} voices from 11Labs`);
    
    return data;
  } catch (error) {
    console.error('Error listing voices from 11Labs:', error);
    throw new Error(`Failed to list voices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}