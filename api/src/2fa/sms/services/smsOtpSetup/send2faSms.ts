import { sendTwilioSms } from '../../../../crm/sms/services/sendSms/sendTwillioSms';
import { getAutonOtpPhoneNumber } from './getAutonOtpPhone';

export interface Send2faSmsParams {
  toPhoneNumber: string;
  messageBody: string;
}

export interface Send2faSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Sends SMS for 2FA purposes using the designated global Auton phone number
 * This uses a centralized Auton phone number instead of tenant-specific numbers
 */
export const send2faSms = async ({
  toPhoneNumber,
  messageBody
}: Send2faSmsParams): Promise<Send2faSmsResult> => {
  try {
    console.log(`📱 Sending 2FA SMS to ${toPhoneNumber} using designated Auton phone number`);

    // Get the designated Auton OTP phone number from global admin collection
    const autonPhoneNumber = await getAutonOtpPhoneNumber();
    if (!autonPhoneNumber) {
      return {
        success: false,
        error: 'No designated Auton phone number available for OTP sending. Please configure a global OTP phone number.'
      };
    }

    console.log(`📞 Using designated Auton phone number: ${autonPhoneNumber}`);

    // Send SMS directly via Twilio (bypassing conversation saving)
    const twilioResponse = await sendTwilioSms.sendSmsDirectFromNumber(
      autonPhoneNumber,
      toPhoneNumber,
      messageBody
    );

    console.log(`✅ 2FA SMS sent successfully from Auton phone. Message SID: ${twilioResponse.messageSid}`);

    return {
      success: true,
      messageSid: twilioResponse.messageSid
    };

  } catch (error: any) {
    console.error('Error sending 2FA SMS:', error);
    return {
      success: false,
      error: `Failed to send 2FA SMS: ${error.message}`
    };
  }
};