import { generateCaseNumberService } from './generateCaseNumber';
import { conversationManager } from './conversationManager';

/**
 * Agent SMS sending service
 * Sends SMS messages on behalf of agents using the CRM SMS system
 */

export interface SendAgentSmsRequest {
  tenantId: string;
  agentId: string;
  contactId: string;
  conversationId?: string; // Optional - will find or create if not provided
  message: string;
  to: string; // Recipient phone number
  from?: string; // Sender phone number (optional, will use agent's default if not provided)
  caseId?: string; // Associated case ID
}

export interface SendAgentSmsResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  caseId?: string;
}

export class SendAgentSmsService {
  /**
   * Send SMS message on behalf of an agent
   */
  async sendSms(request: SendAgentSmsRequest): Promise<SendAgentSmsResponse> {
    try {
      console.log(`= Sending SMS on behalf of agent ${request.agentId}`);
      console.log(`  - To: ${request.to}`);
      console.log(`  - Message: "${request.message}"`);
      console.log(`  - Case ID: ${request.caseId || 'None'}`);

      // Step 1: Get agent's phone number if not provided
      const phoneNumber = request.from || await this.getAgentPhoneNumber(request.tenantId, request.agentId);

      if (!phoneNumber) {
        return {
          success: false,
          error: 'No phone number configured for agent',
          caseId: request.caseId
        };
      }

      console.log(`  - From: ${phoneNumber}`);

      // Step 2: Get or create conversation ID if not provided
      let conversationId = request.conversationId;
      if (!conversationId) {
        console.log('No conversation ID provided, finding or creating one...');
        conversationId = await conversationManager.findOrCreateConversation(request.tenantId, request.contactId);
        console.log(`Using conversation ID: ${conversationId}`);
      }

      // Step 2.5: Ensure contact has phone address record (required for frontend display)
      const { ensureContactAddress } = await import('../../../contacts/utilities/ensureContactAddress');
      await ensureContactAddress(request.tenantId, request.contactId, 'SMS', request.to);

      // Step 3: Send SMS via CRM SMS system
      console.log('= Calling CRM SMS send endpoint...');
      
      const smsPayload = {
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: conversationId,
        phoneNumber: phoneNumber,
        message: request.message,
        to: request.to,
        agentId: request.agentId // Include agent ID to mark as agent-sent
      };

      // Call the CRM SMS endpoint
      const response = await this.callCrmSmsEndpoint(smsPayload);

      if (!response.success) {
        console.error('CRM SMS sending failed:', response.error);
        
        // Update case status if caseId provided
        if (request.caseId) {
          await generateCaseNumberService.updateCaseStatus(
            request.tenantId,
            request.agentId,
            request.caseId,
            'failed',
            'sms_send_failed'
          );
        }

        return {
          success: false,
          error: response.error,
          caseId: request.caseId
        };
      }

      console.log(`= SMS sent successfully via agent ${request.agentId}`);
      console.log(`  - Message ID: ${response.messageId}`);

      // Update case with sent message info if caseId provided
      if (request.caseId) {
        await generateCaseNumberService.updateCaseAnalysis(
          request.tenantId,
          request.agentId,
          request.caseId,
          {
            sentMessageId: response.messageId,
            sentAt: new Date().toISOString(),
            sentTo: request.to,
            sentFrom: phoneNumber
          }
        );

        await generateCaseNumberService.updateCaseStatus(
          request.tenantId,
          request.agentId,
          request.caseId,
          'completed',
          'message_sent',
          'sms_sending'
        );
      }

      return {
        success: true,
        messageId: response.messageId,
        status: response.status || 'sent',
        caseId: request.caseId
      };

    } catch (error) {
      console.error('Error sending agent SMS:', error);

      // Update case status to failed if caseId provided
      if (request.caseId) {
        try {
          await generateCaseNumberService.updateCaseStatus(
            request.tenantId,
            request.agentId,
            request.caseId,
            'failed',
            'sms_send_error'
          );
        } catch (updateError) {
          console.error('Failed to update case status:', updateError);
        }
      }

      return {
        success: false,
        error: `Failed to send agent SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        caseId: request.caseId
      };
    }
  }

  /**
   * Call the CRM SMS endpoint to send the message
   */
  private async callCrmSmsEndpoint(payload: any): Promise<{
    success: boolean;
    messageId?: string;
    status?: string;
    error?: string;
  }> {
    try {
      // Use internal service call instead of HTTP for better performance and reliability
      const { sendSmsService } = await import('../../../crm/sms/services/sendSms');
      
      const result = await sendSmsService.sendMessage(payload);
      
      return {
        success: true,
        messageId: result.messageId,
        status: result.status
      };

    } catch (error) {
      console.error('Error calling CRM SMS service:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get agent's configured phone number
   */
  private async getAgentPhoneNumber(tenantId: string, agentId: string): Promise<string | null> {
    try {
      console.log(`Getting phone number for agent ${agentId} in tenant ${tenantId}`);
      
      const { firestore } = await import('../../../config/firebase');
      const agentRef = firestore.collection('tenants').doc(tenantId).collection('agents').doc(agentId);
      const agentDoc = await agentRef.get();
      
      if (!agentDoc.exists) {
        console.warn(`Agent ${agentId} not found in tenant ${tenantId}`);
        return null;
      }
      
      const agentData = agentDoc.data();
      const phoneNumber = agentData?.agentPhoneNumber;
      
      if (phoneNumber) {
        console.log(`Found agent phone number: ${phoneNumber}`);
        return phoneNumber;
      } else {
        console.warn(`No phone number configured for agent ${agentId}`);
        return null;
      }

    } catch (error) {
      console.error('Error getting agent phone number:', error);
      return null;
    }
  }

  /**
   * Send SMS using case data (convenience method)
   */
  async sendSmsFromCase(
    tenantId: string,
    agentId: string,
    caseId: string,
    phoneNumber: string
  ): Promise<SendAgentSmsResponse> {
    try {
      // Load case data
      const caseData = await generateCaseNumberService.getCase(tenantId, agentId, caseId);
      
      if (!caseData) {
        return {
          success: false,
          error: 'Case not found',
          caseId
        };
      }

      if (!caseData.response) {
        return {
          success: false,
          error: 'No response generated for case',
          caseId
        };
      }

      // Extract recipient from case data
      const to = caseData.from; // Reply to the original sender
      
      if (!to) {
        return {
          success: false,
          error: 'No recipient phone number found in case',
          caseId
        };
      }

      // Get or create conversation for the contact if not provided in case data
      let conversationId = caseData.conversationId;
      if (!conversationId) {
        console.log('No conversation ID in case data, finding or creating one...');
        conversationId = await conversationManager.findOrCreateConversation(tenantId, caseData.contactId);
      }

      // Ensure contact has phone address record (required for frontend display)
      const { ensureContactAddress } = await import('../../../contacts/utilities/ensureContactAddress');
      await ensureContactAddress(tenantId, caseData.contactId, 'SMS', to);

      return await this.sendSms({
        tenantId,
        agentId,
        contactId: caseData.contactId,
        conversationId: conversationId,
        message: caseData.response,
        to,
        from: phoneNumber,
        caseId
      });

    } catch (error) {
      console.error('Error sending SMS from case:', error);
      
      return {
        success: false,
        error: `Failed to send SMS from case: ${error instanceof Error ? error.message : 'Unknown error'}`,
        caseId
      };
    }
  }
}

export const sendAgentSmsService = new SendAgentSmsService();