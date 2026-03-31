import { findPhoneNumberSid } from './sendSms/findPhoneNumberSid';
import { sendTwilioSms } from './sendSms/sendTwillioSms';
import { saveToFirestoreConvo } from './sendSms/saveToFirestoreConvo';
import { conversationManager } from '../../../agentCommunication/sms/services/conversationManager';
import { prepareSmsContent } from './sendSms/prepareSmsContent';
import { ensureContactAddress } from '../../../contacts/utilities/ensureContactAddress';

export interface SendMessageRequest {
  tenantId: string;
  contactId: string;
  conversationId?: string; // Optional - will be created if not provided
  phoneNumber: string; // The from phone number (that we own)
  message: string;
  to: string; // The recipient phone number
  agentId?: string; // Optional agent ID for agent-sent messages
  userId?: string; // Optional user ID for user-sent messages
}

export interface SendMessageResponse {
  messageId: string;
  status: string;
  conversationId: string; // Return conversationId so frontend knows which conversation was created/used
}

class SendSmsService {
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      console.log(`Starting SMS send flow for tenant ${request.tenantId}`);

      // Step 0: Ensure conversation exists (create if missing)
      let conversationId: string = request.conversationId || '';
      if (!conversationId) {
        console.log(`Step 0: No conversation ID provided, creating conversation for contact ${request.contactId}`);
        conversationId = await conversationManager.findOrCreateConversation(request.tenantId, request.contactId);
        console.log(`Step 0: Using conversation ID: ${conversationId}`);
      } else {
        console.log(`Step 0: Using provided conversation ID: ${conversationId}`);
      }

      // Step 0.1: Ensure contact has phone address record (required for frontend display)
      await ensureContactAddress(request.tenantId, request.contactId, 'SMS', request.to);

      // Step 0.5: Prepare SMS content with variable injection
      console.log(`Step 0.5: Preparing SMS content with variable substitution`);
      const preparedContent = await prepareSmsContent.prepare({
        tenantId: request.tenantId,
        contactId: request.contactId,
        content: request.message
      });

      const finalMessage = preparedContent.preparedContent;

      console.log(`Step 0.5: Content preparation complete (${preparedContent.variablesFound.length} variables processed)`);

      // Step 1: Find the Twilio SID for the phone number
      console.log(`Step 1: Finding SID for phone number ${request.phoneNumber}`);
      const phoneNumberSid = await findPhoneNumberSid.findSidByPhoneNumber(
        request.tenantId,
        request.phoneNumber
      );

      // Step 2: Send SMS via Twilio
      console.log(`Step 2: Sending SMS via Twilio`);
      const twilioResponse = await sendTwilioSms.sendSms({
        phoneNumberSid: phoneNumberSid,
        fromPhoneNumber: request.phoneNumber,
        toPhoneNumber: request.to,
        messageBody: finalMessage,
        tenantId: request.tenantId
      });

      console.log(`Twilio response: Message SID ${twilioResponse.messageSid}, Status: ${twilioResponse.status}`);

      // Step 3: Save the outbound message to Firestore conversation
      console.log(`Step 3: Saving outbound message to Firestore`);
      await saveToFirestoreConvo.saveOutboundMessage({
        tenantId: request.tenantId,
        contactId: request.contactId,
        conversationId: conversationId, // Use the conversation ID we obtained/created
        messageSid: twilioResponse.messageSid,
        fromPhoneNumber: request.phoneNumber,
        toPhoneNumber: request.to,
        messageBody: finalMessage,
        direction: 'outbound',
        agentId: request.agentId,
        userId: request.userId
      });

      console.log(`Successfully completed SMS send flow. Message ID: ${twilioResponse.messageSid}`);

      return {
        messageId: twilioResponse.messageSid,
        status: twilioResponse.status,
        conversationId: conversationId // Return the conversation ID that was created or used
      };

    } catch (error) {
      console.error('Error in SMS send flow:', error);
      throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMessageStatus(
    tenantId: string,
    contactId: string,
    conversationId: string,
    messageSid: string,
    status: string
  ): Promise<void> {
    try {
      await saveToFirestoreConvo.updateMessageStatus(
        tenantId,
        contactId,
        conversationId,
        messageSid,
        status
      );
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }
}

export const sendSmsService = new SendSmsService();