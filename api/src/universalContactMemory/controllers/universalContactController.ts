import { Request, Response } from 'express';
import { contactOverviewOrchestrator } from '../ochestrators/contactOverviewOcrhestrator';

/**
 * Universal Contact Controller
 * Handles HTTP requests for unified contact memory operations
 *
 * Primary endpoint: Contact Overview (profile + conversation history)
 */

export class UniversalContactController {
  /**
   * Get complete contact overview: AI profile + conversation history
   * GET /api/universal-contact-memory/contact-overview
   *
   * Query Parameters:
   * - tenantId: string (required)
   * - contactId: string (required)
   * - conversationId?: string (optional - for production mode)
   * - sessionId?: string (optional - for training mode)
   * - messageLimit?: number (optional - default: 15)
   * - isTraining?: boolean (optional - default: false)
   */
  async getContactOverview(req: Request, res: Response) {
    try {
      const {
        tenantId,
        contactId,
        conversationId,
        sessionId,
        messageLimit,
        isTraining
      } = req.query;

      console.log('<� Universal Contact Controller: Get Contact Overview');
      console.log(`  - Tenant ID: ${tenantId}`);
      console.log(`  - Contact ID: ${contactId}`);
      console.log(`  - Conversation ID: ${conversationId || 'N/A'}`);
      console.log(`  - Session ID: ${sessionId || 'N/A'}`);
      console.log(`  - Message Limit: ${messageLimit || 15}`);
      console.log(`  - Is Training: ${isTraining || false}`);

      // Validate required parameters
      if (!tenantId || typeof tenantId !== 'string') {
        console.error('L Missing or invalid tenantId parameter');
        res.status(400).json({
          success: false,
          error: 'Missing or invalid parameter',
          message: 'tenantId is required and must be a string'
        });
        return;
      }

      if (!contactId || typeof contactId !== 'string') {
        console.error('L Missing or invalid contactId parameter');
        res.status(400).json({
          success: false,
          error: 'Missing or invalid parameter',
          message: 'contactId is required and must be a string'
        });
        return;
      }

      // Parse optional parameters
      const parsedMessageLimit = messageLimit ? parseInt(messageLimit as string, 10) : 15;
      const parsedIsTraining = isTraining === 'true';

      // Validate messageLimit if provided
      if (isNaN(parsedMessageLimit) || parsedMessageLimit < 1) {
        console.error('L Invalid messageLimit parameter');
        res.status(400).json({
          success: false,
          error: 'Invalid parameter',
          message: 'messageLimit must be a positive number'
        });
        return;
      }

      // Call orchestrator to fetch complete contact overview
      const result = await contactOverviewOrchestrator.getContactOverview({
        tenantId,
        contactId,
        conversationId: conversationId as string | undefined,
        sessionId: sessionId as string | undefined,
        messageLimit: parsedMessageLimit,
        isTraining: parsedIsTraining
      });

      if (!result.success) {
        console.error('L Orchestrator returned error:', result.error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch contact overview',
          message: result.error
        });
        return;
      }

      console.log(' Contact overview retrieved successfully');
      console.log(`  - Profile populated: ${!result.data?.contactProfile.isEmpty}`);
      console.log(`  - Messages: ${result.data?.conversationHistory.messages.length}`);
      console.log(`  - Total context size: ${(result.data?.promptContext.contactProfileSection.length || 0) + (result.data?.promptContext.conversationHistorySection.length || 0)} chars`);

      res.status(200).json({
        success: true,
        data: result.data
      });

    } catch (error) {
      console.error('L Universal Contact Controller: Error getting contact overview:', error);

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

export const universalContactController = new UniversalContactController();
