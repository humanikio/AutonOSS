interface VoiceSettings {
  stability: number;
  use_speaker_boost: boolean;
  similarity_boost: number;
  style: number;
  speed: number;
}

interface VoiceSample {
  sample_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  hash: string;
  duration_secs: number;
  remove_background_noise: boolean;
  has_isolated_audio: boolean;
  has_isolated_audio_preview: boolean;
}

interface VerifiedLanguage {
  language: string;
  model_id: string;
  accent: string;
  locale: string;
  preview_url: string;
}

interface VoiceDetails {
  voice_id: string;
  name: string;
  samples: VoiceSample[];
  category: string;
  labels: { [key: string]: string };
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: VoiceSettings;
  high_quality_base_model_ids: string[];
  verified_languages: VerifiedLanguage[];
  is_owner: boolean;
  is_legacy: boolean;
  is_mixed: boolean;
  created_at_unix: number;
}

export async function getVoice(voiceId: string): Promise<VoiceDetails> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VoiceDetails;
    
    console.log(`Successfully retrieved voice details for ${voiceId}: ${data.name}`);
    
    return data;
  } catch (error) {
    console.error('Error getting voice details from 11Labs:', error);
    throw new Error(`Failed to get voice details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}