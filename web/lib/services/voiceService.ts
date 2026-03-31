import apiClient from '../api/client';

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: { [key: string]: string };
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: {
    stability: number;
    use_speaker_boost: boolean;
    similarity_boost: number;
    style: number;
    speed: number;
  };
  is_owner: boolean;
  is_legacy: boolean;
  is_mixed: boolean;
  created_at_unix: number;
}

export interface VoiceDetails extends Voice {
  samples: {
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    duration_secs: number;
  }[];
  high_quality_base_model_ids: string[];
  verified_languages: {
    language: string;
    model_id: string;
    accent: string;
    locale: string;
    preview_url: string;
  }[];
}

export interface ListVoicesResponse {
  voices: Voice[];
  has_more: boolean;
  total_count: number;
  next_page_token: string | null;
}

export interface ListVoicesParams {
  search?: string;
  pageSize?: number;
  nextPageToken?: string;
  voiceType?: string;
  category?: string;
}

export class VoiceService {
  static async listVoices(agentId: string, params: ListVoicesParams = {}): Promise<ListVoicesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.nextPageToken) queryParams.append('nextPageToken', params.nextPageToken);
    if (params.voiceType) queryParams.append('voiceType', params.voiceType);
    if (params.category) queryParams.append('category', params.category);
    
    const url = `/api/agent-management/${agentId}/voices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await apiClient.get(url);
    return response.data.data; // Backend wraps response in { success: true, data: ... }
  }

  static async getVoice(agentId: string, voiceId: string): Promise<VoiceDetails> {
    const response = await apiClient.get(`/api/agent-management/${agentId}/voices/${voiceId}`);
    return response.data.data; // Backend wraps response in { success: true, data: ... }
  }

  static async updateVoiceConfig(agentId: string, action: string, data: any): Promise<any> {
    const response = await apiClient.post(`/api/agent-management/${agentId}/voice-config`, {
      action,
      ...data
    });
    return response.data.data; // Backend wraps response in { success: true, data: ... }
  }

  static async selectVoice(agentId: string, voiceId: string, voiceSettings?: {
    stability?: number;
    speed?: number;
    similarity_boost?: number;
  }): Promise<any> {
    const response = await apiClient.post(`/api/agent-management/${agentId}/voice-config`, {
      action: 'selectVoice',
      voiceId,
      voiceSettings
    });
    return response.data.data; // Backend wraps response in { success: true, data: ... }
  }
}