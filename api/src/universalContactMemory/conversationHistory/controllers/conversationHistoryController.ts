import { Request, Response } from 'express';
import { getConversationHistoryService } from '../services/getConversationHistory';

export class ConversationHistoryController {
  /**
   * Handle GET request for conversation history
   */
  async getConversationHistory(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { contactId, conversationId } = req.params;
      const messageLimit = req.query.messageLimit ? parseInt(req.query.messageLimit as string, 10) : 15;

      console.log('> Conversation History Controller: Processing request');
      console.log('= Request Details:');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Conversation ID: ${conversationId}`);
      console.log(`  - Message Limit: ${messageLimit}`);
      console.log('=====================================');

      // Validate required parameters
      if (!tenantId || !contactId || !conversationId) {
        console.error('Missing required parameters');
        res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          message: 'contactId and conversationId are required'
        });
        return;
      }

      // Validate messageLimit is a reasonable number
      if (isNaN(messageLimit) || messageLimit < 1 || messageLimit > 100) {
        console.error('Invalid message limit:', messageLimit);
        res.status(400).json({
          success: false,
          error: 'Invalid message limit',
          message: 'messageLimit must be a number between 1 and 100'
        });
        return;
      }

      // Call the service to get conversation history
      console.log('= Calling conversation history service...');
      
      const result = await getConversationHistoryService.getHistory({
        tenantId,
        contactId,
        conversationId,
        messageLimit
      });

      if (!result.success) {
        console.error('Service returned error:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve conversation history',
          message: result.error
        });
        return;
      }

      console.log(' Conversation history retrieved successfully');
      console.log(`= Data summary:`, {
        messagesCount: result.data?.messages?.length || 0,
        hasSummary: !!result.data?.summary,
        hasMoreHistory: result.data?.hasMoreHistory || false,
        totalMessages: result.data?.totalMessages || 0
      });

      // Send successful response
      res.status(200).json({
        success: true,
        message: 'Conversation history retrieved successfully',
        data: result.data
      });

      // Note: Background summarization check will be triggered after response is sent
      // This is handled by the service layer

    } catch (error) {
      console.error('L Conversation History Controller: Error processing request:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const conversationHistoryController = new ConversationHistoryController();