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
      
      console.log('=Þ Received ElevenLabs webhook:', {
        type: req.headers['content-type'],
        signature: signature ? 'present' : 'missing',
        bodyLength: typeof rawBody === 'string' ? rawBody.length : 'not string'
      });

      // Verify webhook signature if secret is configured
      const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
      if (webhookSecret && signature) {
        const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
        const isValid = CallAnalyticsService.verifyWebhookSignature(
          signature,
          bodyString,
          webhookSecret
        );
        
        if (!isValid) {
          console.error('L Invalid webhook signature');
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
        console.log(' Webhook signature verified');
      } else if (webhookSecret) {
        console.warn('  Webhook secret configured but no signature provided');
      }

      // Parse the webhook payload
      let payload: ElevenLabsWebhookPayload;
      try {
        payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
      } catch (error) {
        console.error('L Failed to parse webhook payload:', error);
        res.status(400).json({ error: 'Invalid JSON payload' });
        return;
      }

      console.log('=Ë Webhook payload:', {
        type: payload.type,
        eventTimestamp: payload.eventTimestamp,
        agentId: payload.data.agentId,
        conversationId: payload.data.conversationId
      });

      // For now, we'll extract tenant ID from the request
      // In production, you might want to include tenant info in the webhook URL or payload
      const tenantId = req.query.tenantId as string;
      
      if (!tenantId) {
        console.error('L No tenant ID provided in webhook request');
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      // Process based on webhook type
      if (payload.type === 'post_call_transcription') {
        await CallAnalyticsService.processTranscriptionWebhook(payload, tenantId);
        console.log(' Transcription webhook processed successfully');
      } else if (payload.type === 'post_call_audio') {
        await CallAnalyticsService.processAudioWebhook(payload, tenantId);
        console.log(' Audio webhook processed successfully');
      } else {
        console.warn('  Unknown webhook type:', payload.type);
      }

      res.status(200).json({ status: 'ok' });

    } catch (error) {
      console.error('L Error processing webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get call logs for the authenticated tenant
   */
  static async getCallLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { 
        agentId, 
        limit = '50',
        startAfter,
        startDate,
        endDate 
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string),
        agentId: agentId as string,
        startAfter: startAfter as string
      };

      // Parse date range if provided
      if (startDate && endDate) {
        options.dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const result = await CallAnalyticsService.getCallLogs(tenantId, options);

      res.json({
        success: true,
        data: result.callLogs,
        hasMore: result.hasMore,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting call logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call logs',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get call analytics summary for the authenticated tenant
   */
  static async getAnalyticsSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { startDate, endDate } = req.query;

      let dateRange;
      if (startDate && endDate) {
        dateRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string)
        };
      }

      const summary = await CallAnalyticsService.getCallAnalyticsSummary(tenantId, dateRange);

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting analytics summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics summary',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get a specific call log
   */
  static async getCallLog(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { conversationId } = req.params;
      
      if (!tenantId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const callLog = await CallAnalyticsService.getCallLog(tenantId, conversationId);

      if (!callLog) {
        res.status(404).json({
          success: false,
          error: 'Call log not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: callLog,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting call log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call log',
        timestamp: new Date().toISOString()
      });
    }
  }
}