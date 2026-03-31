import { ElevenLabsVoice } from '@/types';

class ElevenLabsVoiceService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 500ms between requests
  private voicesCache: { data: any, timestamp: number } | null = null;
  private voicesCacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.throttleRequest();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle rate limiting with retry
      if (response.status === 429) {
        console.warn('ElevenLabs rate limit hit, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        throw new Error(`ElevenLabs rate limited: ${response.status} - ${errorText}`);
      }
      
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Handle empty responses (like DELETE requests)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    }
    
    return {};
  }

  // Get all available voices (with caching)
  async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      // Check cache first
      if (this.voicesCache && (Date.now() - this.voicesCache.timestamp) < this.voicesCacheTTL) {
        return this.voicesCache.data;
      }

      const response = await this.makeRequest('/voices');
      const voices = response.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        samples: voice.samples,
        category: voice.category,
        labels: voice.labels,
        description: voice.description,
        preview_url: voice.preview_url
      }));

      // Cache the result
      this.voicesCache = {
        data: voices,
        timestamp: Date.now()
      };

      return voices;
    } catch (error) {
      console.error('Failed to get voices:', error);
      throw error;
    }
  }

  // Get voice details
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    try {
      const voice = await this.makeRequest(`/voices/${voiceId}`);
      return {
        voice_id: voice.voice_id,
        name: voice.name,
        samples: voice.samples,
        category: voice.category,
        labels: voice.labels,
        description: voice.description,
        preview_url: voice.preview_url
      };
    } catch (error) {
      console.error(`Failed to get voice ${voiceId}:`, error);
      throw error;
    }
  }

  // Generate voice preview
  async generateVoicePreview(voiceId: string, text: string): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Failed to generate voice preview:', error);
      throw error;
    }
  }
}

export const elevenlabsVoiceService = new ElevenLabsVoiceService();