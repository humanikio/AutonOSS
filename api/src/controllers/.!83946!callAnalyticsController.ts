import { Request, Response } from 'express';
import { CallAnalyticsService, ElevenLabsWebhookPayload } from '../services/callAnalyticsService';

export class CallAnalyticsController {
  
  /**
   * Webhook endpoint for ElevenLabs post-call data
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['elevenlabs-signature'] as string;
      const rawBody = req.body;
      
