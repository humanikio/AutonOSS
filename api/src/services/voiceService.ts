import { elevenlabsVoiceService } from './elevenlabsVoiceService';
import { ElevenLabsVoice } from '@/types';

export class VoiceService {
  // Get all available voices from ElevenLabs
  static async getVoices(): Promise<ElevenLabsVoice[]> {
    try {
      return await elevenlabsVoiceService.getVoices();
    } catch (error) {
      console.error('Voice service - Failed to get voices:', error);
      throw new Error('Failed to retrieve voices from ElevenLabs');
    }
  }

  // Generate voice preview audio
  static async generateVoicePreview(voiceId: string, text: string): Promise<Buffer> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text is required for voice preview');
      }

      if (!voiceId || voiceId.trim().length === 0) {
        throw new Error('Voice ID is required for voice preview');
      }

      return await elevenlabsVoiceService.generateVoicePreview(voiceId, text);
    } catch (error) {
      console.error(`Voice service - Failed to generate preview for voice ${voiceId}:`, error);
      throw error;
    }
  }

  // Get specific voice details
  static async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    try {
      if (!voiceId || voiceId.trim().length === 0) {
        throw new Error('Voice ID is required');
      }

      return await elevenlabsVoiceService.getVoice(voiceId);
    } catch (error) {
      console.error(`Voice service - Failed to get voice ${voiceId}:`, error);
      throw new Error('Failed to retrieve voice details');
    }
  }
}

export const voiceService = VoiceService;