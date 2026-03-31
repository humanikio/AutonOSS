import twilio from 'twilio';
import { manageMessagingService } from '../../../../phoneNumbers/services/ManageMessagingService';

interface SendTwilioSmsRequest {
  phoneNumberSid: string;
  fromPhoneNumber: string;
  toPhoneNumber: string;
  messageBody: string;
  tenantId: string;
}

interface TwilioSmsResponse {
  messageSid: string;
  status: string;
}

class SendTwilioSms {
  private twilioClient: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKeySid = process.env.TWILIO_API_KEY_SID;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is required');
    }

    // Use API Key if available for better security, otherwise fall back to Auth Token
    if (apiKeySid && apiKeySecret) {
      console.log('Using Twilio API Key authentication');
      this.twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
    } else if (authToken) {
      console.log('Using Twilio Auth Token authentication');
      this.twilioClient = twilio(accountSid, authToken);
    } else {
      throw new Error('Either TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN must be provided');
    }
  }

  async sendSms(request: SendTwilioSmsRequest): Promise<TwilioSmsResponse> {
    try {
      console.log(`Sending SMS via Twilio from ${request.phoneNumberSid} to ${request.toPhoneNumber}`);

      // Get the messaging service ID for this tenant
      const messagingServiceId = await manageMessagingService.getMessagingServiceForTenant(request.tenantId);
      
      if (!messagingServiceId) {
        throw new Error(`No messaging service found for tenant ${request.tenantId}`);
      }

      console.log(`Using messaging service: ${messagingServiceId}`);

      // Send SMS using Twilio API with Messaging Service and explicit From override
      const message = await this.twilioClient.messages.create({
        to: request.toPhoneNumber,
        from: request.fromPhoneNumber, // Force specific sender from messaging service pool
        body: request.messageBody,
        messagingServiceSid: messagingServiceId // Use messaging service for webhooks/analytics
      });

      console.log(`Successfully sent SMS. Message SID: ${message.sid}, Status: ${message.status}`);

      return {
        messageSid: message.sid,
        status: message.status
      };

    } catch (error) {
      console.error('Error sending SMS via Twilio:', error);
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('21603')) {
          throw new Error('Missing From or MessagingServiceSid parameter');
        } else if (error.message.includes('21211')) {
          throw new Error('Invalid To phone number format');
        } else if (error.message.includes('21614')) {
          throw new Error('Message body is required');
        }
        throw new Error(`Twilio API error: ${error.message}`);
      }
      
      throw new Error('Unknown error occurred while sending SMS');
    }
  }

  // Alternative method to send SMS directly from a phone number (without messaging service)
  async sendSmsDirectFromNumber(fromPhoneNumber: string, toPhoneNumber: string, messageBody: string): Promise<TwilioSmsResponse> {
    try {
      console.log(`Sending SMS directly from ${fromPhoneNumber} to ${toPhoneNumber}`);

      const message = await this.twilioClient.messages.create({
        to: toPhoneNumber,
        from: fromPhoneNumber,
        body: messageBody
      });

      console.log(`Successfully sent SMS. Message SID: ${message.sid}, Status: ${message.status}`);

      return {
        messageSid: message.sid,
        status: message.status
      };

    } catch (error) {
      console.error('Error sending SMS directly via Twilio:', error);
      throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const sendTwilioSms = new SendTwilioSms();