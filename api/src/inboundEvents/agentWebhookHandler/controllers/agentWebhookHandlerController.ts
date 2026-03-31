import { Request, Response } from 'express';
import { processNewRequestService } from '../services/processNewRequest';

export class AgentWebhookHandlerController {
  /**
   * Handle universal webhook requests with encoded agent context
   */
  async handleUniversalWebhook(req: Request, res: Response) {
    try {
      const { encodedData } = req.params;
      
      console.log('<¯ Agent Webhook Handler Controller: Processing universal webhook');
      console.log('= Encoded Data Parameter:', encodedData);
      console.log('=Ê Request Body Keys:', Object.keys(req.body));
      console.log('=====================================');

      if (!encodedData) {
        console.error('L No encoded data parameter provided');
        return res.status(400).json({
          success: false,
          error: 'Missing encoded data parameter',
          message: 'The webhook URL must include base64-encoded agent context'
        });
      }

      // Process the webhook request through the main service
      const result = await processNewRequestService.processRequest({
        encodedData,
        requestBody: req.body,
        headers: req.headers,
        method: req.method,
        originalUrl: req.originalUrl
      });

      if (!result.success) {
        console.error('L Webhook processing failed:', result.error);
        return res.status(result.statusCode || 500).json({
          success: false,
          error: result.error,
          message: result.message || 'Failed to process webhook request'
        });
      }

      console.log(' Webhook processed successfully');
      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result.data
      });

    } catch (error) {
      console.error('=¥ Agent Webhook Handler Controller: Unexpected error:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const agentWebhookHandlerController = new AgentWebhookHandlerController();