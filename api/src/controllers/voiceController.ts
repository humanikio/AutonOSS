import { Request, Response } from 'express';
import { voiceService } from '../services/voiceService';
import { ApiResponse } from '@/types';

export class VoiceController {
  // Get all voices from ElevenLabs
  static async getVoices(req: Request, res: Response): Promise<void> {
    try {
      const voices = await voiceService.getVoices();
      
      res.status(200).json({
        success: true,
        data: voices,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get voices error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get voices',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Generate voice preview
  static async generateVoicePreview(req: Request, res: Response): Promise<void> {
    try {
      const { voiceId } = req.params;
      const { text } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'Text is required for voice preview',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const audioBuffer = await voiceService.generateVoicePreview(voiceId, text);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      });
      
      res.send(audioBuffer);
    } catch (error: any) {
      console.error('Generate voice preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate voice preview',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get specific voice details
  static async getVoice(req: Request, res: Response): Promise<void> {
    try {
      const { voiceId } = req.params;

      if (!voiceId) {
        res.status(400).json({
          success: false,
          error: 'Voice ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const voice = await voiceService.getVoice(voiceId);
      
      res.status(200).json({
        success: true,
        data: voice,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Get voice error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get voice details',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}