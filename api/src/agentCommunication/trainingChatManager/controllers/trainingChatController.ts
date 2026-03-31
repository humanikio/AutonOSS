import { Request, Response } from 'express';
import { getTrainingChatService } from '../services/getTrainingChat';
import { smsAgentController } from '../../sms/controllers/smsAgentController';

export class TrainingChatController {
  /**
   * GET /api/training-chat/:sessionId/messages
   * Get all messages for a training session
   */
  async getSessionMessages(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { limit, startAfter } = req.query;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      console.log(`=Ö Getting training messages for session: ${sessionId}`);

      const result = await getTrainingChatService.getSessionMessages({
        tenantId,
        sessionId,
        limit: limit ? parseInt(limit as string) : undefined,
        startAfter: startAfter as string
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages,
          sessionInfo: result.sessionInfo,
          hasMore: result.hasMore
        }
      });

    } catch (error) {
      console.error('Error getting training messages:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get training messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/training-chat/:sessionId/send
   * Send a message in training mode (processes through agent)
   */
  async sendTrainingMessage(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { message, agentId } = req.body;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!message || !agentId) {
        res.status(400).json({
          success: false,
          error: 'Message and agentId are required'
        });
        return;
      }

      console.log(`=¬ Processing training message for session: ${sessionId}`);
      console.log(`  - Agent: ${agentId}`);
      console.log(`  - Message: "${message}"`);

      // Create the SMS payload with training flags
      const trainingPayload = {
        messageContent: message,
        tenantId,
        contactId: `training_${sessionId}`, // Virtual contact ID for training
        agentId,
        action: 'training_chat',
        messageId: `training_msg_${Date.now()}`,
        conversationId: sessionId, // Use session ID as conversation ID
        isTraining: true, // Flag to indicate training mode
        trainingSessionId: sessionId // Session ID for saving messages
      };

      // Process through SMS agent controller (modified to handle training)
      // Create a mock request/response for the SMS controller
      const mockReq = {
        body: trainingPayload,
        tenantId
      } as Request;

      const mockRes = {
        status: (code: number) => ({
          json: (data: any) => {
            if (code >= 200 && code < 300) {
              res.status(200).json({
                success: true,
                data: {
                  messageId: data.data?.messageId,
                  caseId: data.data?.caseId,
                  analysisId: data.data?.analysisId,
                  generatedResponse: data.data?.generatedResponse,
                  processingStatus: data.data?.processingStatus,
                  ragNeeded: data.data?.ragNeeded,
                  documentsUsed: data.data?.documentsUsed
                }
              });
            } else {
              res.status(code).json(data);
            }
          }
        })
      } as Response;

      // Process the message through the SMS pipeline
      await smsAgentController.handleInboundAgentSms(mockReq, mockRes);

    } catch (error) {
      console.error('Error sending training message:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send training message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/training-chat/:sessionId/stats
   * Get statistics for a training session
   */
  async getSessionStats(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const tenantId = req.tenantId;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      console.log(`=Ê Getting training session stats: ${sessionId}`);

      const result = await getTrainingChatService.getSessionStats(
        tenantId,
        sessionId
      );

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.stats
      });

    } catch (error) {
      console.error('Error getting session stats:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get session stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const trainingChatController = new TrainingChatController();