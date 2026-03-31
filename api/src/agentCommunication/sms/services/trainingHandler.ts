import { saveTrainingMessageService } from '../../trainingChatManager/services/saveTrainingMessagesFirestore';
import { generateCaseNumberService } from './generateCaseNumber';

/**
 * Training handler service
 * Saves messages to training session instead of sending SMS
 */

export interface TrainingHandlerRequest {
  tenantId: string;
  agentId: string;
  contactId: string;
  trainingSessionId: string;
  conversationId?: string;
  message: string;
  caseId?: string;
  analysisId?: string;
  ragNeeded?: boolean;
  documentContexts?: any[];
  processingTime?: number;
}

export interface TrainingHandlerResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  caseId?: string;
}

export class TrainingHandlerService {
  /**
   * Save agent response to training session instead of sending SMS
   */
  async handleTrainingResponse(request: TrainingHandlerRequest): Promise<TrainingHandlerResponse> {
    try {
      console.log(`=� Training Mode: Saving agent response for session ${request.trainingSessionId}`);
      console.log(`  - Message: "${request.message}"`);
      console.log(`  - Case ID: ${request.caseId || 'None'}`);

      // Save the agent's response to the training session
      const saveResult = await saveTrainingMessageService.saveMessage({
        tenantId: request.tenantId,
        sessionId: request.trainingSessionId,
        message: {
          sender: 'agent',
          content: request.message,
          metadata: {
            agentId: request.agentId,
            caseId: request.caseId,
            analysisId: request.analysisId,
            ragUsed: request.ragNeeded || false,
            documentsUsed: request.documentContexts?.length || 0,
            processingTime: request.processingTime
          }
        }
      });

      if (!saveResult.success) {
        console.error('Failed to save training message:', saveResult.error);
        
        // Update case status if caseId provided
        if (request.caseId) {
          await generateCaseNumberService.updateCaseStatus(
            request.tenantId,
            request.agentId,
            request.caseId,
            'failed',
            'training_save_failed'
          );
        }

        return {
          success: false,
          error: saveResult.error,
          caseId: request.caseId
        };
      }

      console.log(` Training message saved successfully`);
      console.log(`  - Message ID: ${saveResult.messageId}`);

      // Update case with training message info if caseId provided
      if (request.caseId) {
        await generateCaseNumberService.updateCaseAnalysis(
          request.tenantId,
          request.agentId,
          request.caseId,
          {
            trainingMessageId: saveResult.messageId,
            trainingSessionId: request.trainingSessionId,
            savedAt: new Date().toISOString()
          }
        );

        await generateCaseNumberService.updateCaseStatus(
          request.tenantId,
          request.agentId,
          request.caseId,
          'completed',
          'training_message_saved',
          'training_mode'
        );
      }

      return {
        success: true,
        messageId: saveResult.messageId,
        caseId: request.caseId
      };

    } catch (error) {
      console.error('Error handling training response:', error);

      // Update case status to failed if caseId provided
      if (request.caseId) {
        try {
          await generateCaseNumberService.updateCaseStatus(
            request.tenantId,
            request.agentId,
            request.caseId,
            'failed',
            'training_error'
          );
        } catch (updateError) {
          console.error('Failed to update case status:', updateError);
        }
      }

      return {
        success: false,
        error: `Failed to handle training response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        caseId: request.caseId
      };
    }
  }

  /**
   * Save user message to training session
   */
  async saveUserMessage(
    tenantId: string,
    sessionId: string,
    message: string,
    metadata?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`=� Training Mode: Saving user message for session ${sessionId}`);

      const saveResult = await saveTrainingMessageService.saveMessage({
        tenantId,
        sessionId,
        message: {
          sender: 'user',
          content: message,
          metadata
        }
      });

      if (!saveResult.success) {
        console.error('Failed to save user training message:', saveResult.error);
        return saveResult;
      }

      console.log(` User training message saved successfully`);
      return saveResult;

    } catch (error) {
      console.error('Error saving user training message:', error);
      return {
        success: false,
        error: `Failed to save user message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Save agent message to training session
   */
  async saveAgentMessage(
    tenantId: string,
    sessionId: string,
    message: string,
    metadata?: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`=🧪 Training Mode: Saving agent message for session ${sessionId}`);

      const saveResult = await saveTrainingMessageService.saveMessage({
        tenantId,
        sessionId,
        message: {
          sender: 'agent',
          content: message,
          metadata
        }
      });

      if (!saveResult.success) {
        console.error('Failed to save agent training message:', saveResult.error);
        return saveResult;
      }

      console.log(`✅ Agent training message saved successfully`);
      return saveResult;

    } catch (error) {
      console.error('Error saving agent training message:', error);
      return {
        success: false,
        error: `Failed to save agent message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const trainingHandlerService = new TrainingHandlerService();