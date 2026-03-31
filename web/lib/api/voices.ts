import apiClient from './client';
import { ElevenLabsVoice, ApiResponse } from '@/types';

export const voicesAPI = {
  // Get all voices
  getVoices: async (): Promise<ElevenLabsVoice[]> => {
    const response = await apiClient.get<ApiResponse<ElevenLabsVoice[]>>('/api/voices');
    return response.data.data || [];
  },

  // Get specific voice details
  getVoice: async (voiceId: string): Promise<ElevenLabsVoice> => {
    const response = await apiClient.get<ApiResponse<ElevenLabsVoice>>(`/api/voices/${voiceId}`);
    return response.data.data!;
  },

  // Generate voice preview
  generateVoicePreview: async (voiceId: string, text: string): Promise<Blob> => {
    const response = await apiClient.post(`/api/voices/${voiceId}/preview`, 
      { text },
      { 
        responseType: 'blob',
        headers: { 'Accept': 'audio/mpeg' }
      }
    );
    return response.data;
  }
};