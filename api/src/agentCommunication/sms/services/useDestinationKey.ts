import { post2DestinationService, Post2DestinationRequest } from './destinationKey/post2Destination';
import { sendAgentSmsService, SendAgentSmsRequest, SendAgentSmsResponse } from './sendSms';

export interface UseDestinationKeyRequest {
  destinationKey?: string;
  tenantId: string;
  agentId: string;
  messageData: {
    message: string;
    contactId: string;
    conversationId?: string;
    messageId?: string;
    caseId?: string;
    fromPhone?: string;
    toPhone?: string;
    timestamp?: string;
    // Additional SMS-specific fields for fallback
    to?: string;
    from?: string;
  };
  // Fallback SMS request data
  fallbackSmsRequest?: SendAgentSmsRequest;
}

export interface UseDestinationKeyResponse {
  success: boolean;
  method: 'destination_webhook' | 'traditional_sms';
  destinationKey?: string;
  messageId?: string;
  status?: string;
  error?: string;
  response?: any;
  timeTaken?: number;
}

export class UseDestinationKeyService {
  /**
   * Process message with destination key routing logic
   * If destinationKey exists, route to webhook destination
   * Otherwise, use traditional SMS sending
   */
  async processMessage(request: UseDestinationKeyRequest): Promise<UseDestinationKeyResponse> {
    const startTime = Date.now();

    try {
      console.log(`=¦ UseDestinationKey: Processing message routing`);
      console.log(`=Ë Request details:`, {
        hasDestinationKey: !!request.destinationKey,
        destinationKey: request.destinationKey,
        tenantId: request.tenantId,
        agentId: request.agentId,
        contactId: request.messageData.contactId,
        message: request.messageData.message?.substring(0, 50) + '...'
      });

      // Decision point: Route based on destinationKey presence
      if (request.destinationKey) {
        console.log(`<¯ Routing to destination webhook: ${request.destinationKey}`);
        return await this.routeToDestination(request, startTime);
      } else {
        console.log(`=ñ Routing to traditional SMS sending`);
        return await this.routeToTraditionalSms(request, startTime);
      }

    } catch (error) {
      console.error('L Error in UseDestinationKey service:', error);
      
      return {
        success: false,
        method: request.destinationKey ? 'destination_webhook' : 'traditional_sms',
        destinationKey: request.destinationKey,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timeTaken: Date.now() - startTime
      };
    }
  }

  /**
   * Route message to destination webhook
   */
  private async routeToDestination(
    request: UseDestinationKeyRequest, 
    startTime: number
  ): Promise<UseDestinationKeyResponse> {
    try {
      const destinationRequest: Post2DestinationRequest = {
        destinationKey: request.destinationKey!,
        tenantId: request.tenantId,
        agentId: request.agentId,
        messageData: {
          ...request.messageData,
          timestamp: request.messageData.timestamp || new Date().toISOString()
        }
      };

      const result = await post2DestinationService.sendToDestination(destinationRequest);

      if (result.success) {
        console.log(` Message successfully sent to destination webhook`);
        console.log(`=Ê Response status: ${result.statusCode}`);
      } else {
        console.error(`L Destination webhook failed: ${result.error}`);
      }

      return {
        success: result.success,
        method: 'destination_webhook',
        destinationKey: request.destinationKey,
        messageId: request.messageData.messageId,
        status: result.success ? 'sent_to_webhook' : 'webhook_failed',
        error: result.error,
        response: result.response,
        timeTaken: result.timeTaken
      };

    } catch (error) {
      console.error('L Error routing to destination:', error);
      
      return {
        success: false,
        method: 'destination_webhook',
        destinationKey: request.destinationKey,
        error: error instanceof Error ? error.message : 'Unknown destination routing error',
        timeTaken: Date.now() - startTime
      };
    }
  }

  /**
   * Route message to traditional SMS sending (fallback/default behavior)
   */
  private async routeToTraditionalSms(
    request: UseDestinationKeyRequest, 
    startTime: number
  ): Promise<UseDestinationKeyResponse> {
    try {
      // Use provided fallback SMS request or construct from messageData
      const smsRequest: SendAgentSmsRequest = request.fallbackSmsRequest || {
        tenantId: request.tenantId,
        agentId: request.agentId,
        contactId: request.messageData.contactId,
        conversationId: request.messageData.conversationId,
        message: request.messageData.message,
        to: request.messageData.to || request.messageData.toPhone || '',
        from: request.messageData.from || request.messageData.fromPhone,
        caseId: request.messageData.caseId
      };

      // Validate required fields for SMS
      if (!smsRequest.to) {
        throw new Error('Missing required field: to (recipient phone number)');
      }

      const result = await sendAgentSmsService.sendSms(smsRequest);

      if (result.success) {
        console.log(` Message successfully sent via traditional SMS`);
        console.log(`=è SMS Message ID: ${result.messageId}`);
      } else {
        console.error(`L Traditional SMS failed: ${result.error}`);
      }

      return {
        success: result.success,
        method: 'traditional_sms',
        messageId: result.messageId,
        status: result.status,
        error: result.error,
        timeTaken: Date.now() - startTime
      };

    } catch (error) {
      console.error('L Error routing to traditional SMS:', error);
      
      return {
        success: false,
        method: 'traditional_sms',
        error: error instanceof Error ? error.message : 'Unknown SMS routing error',
        timeTaken: Date.now() - startTime
      };
    }
  }

  /**
   * Validate destination key format (optional validation)
   */
  validateDestinationKey(destinationKey: string): boolean {
    // Expected format: CATEGORY_TIMESTAMP_RANDOM (e.g., SMS_lm8k3d9_a1b2c3d4e5f6g7h8)
    const pattern = /^(SMS|EMAIL|PHONE)_[a-z0-9]+_[a-f0-9]{16}$/;
    return pattern.test(destinationKey);
  }

  /**
   * Get destination key category (sms, email, phone)
   */
  getDestinationKeyCategory(destinationKey: string): string | null {
    if (!this.validateDestinationKey(destinationKey)) {
      return null;
    }
    
    const parts = destinationKey.split('_');
    return parts[0].toLowerCase();
  }
}

export const useDestinationKeyService = new UseDestinationKeyService();