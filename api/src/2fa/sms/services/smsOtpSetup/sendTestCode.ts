import { storeOtpCode } from '../../smsOtpGenerator';
import { verifyPhoneFormat } from './verifyPhoneFormat';
import { send2faSms } from './send2faSms';
import { 
  SmsOtpSetupParams, 
  SmsOtpSetupResult,
  SMS_OTP_CONFIG
} from '../../models/smsOtpModels';
import { getTotpSecurityRef } from '../../../services/storageHelper';

/**
 * Sends a test SMS OTP code to verify phone number ownership
 */
export const sendTestCode = async ({
  userId,
  tenantId,
  phoneNumber
}: SmsOtpSetupParams): Promise<SmsOtpSetupResult> => {
  try {
    console.log(`=� Sending SMS OTP test code to ${phoneNumber} for user: ${userId}`);

    // Validate phone number format
    const phoneValidation = verifyPhoneFormat(phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.error
      };
    }

    const formattedPhone = phoneValidation.formattedNumber!;

    // Check cooldown period - prevent spam
    const securityRef = getTotpSecurityRef(tenantId, userId);
    const securityDoc = await securityRef.get();
    
    if (securityDoc.exists) {
      const securityData = securityDoc.data();
      const lastCodeSentAt = securityData?.smsOtp?.lastCodeSentAt;
      
      if (lastCodeSentAt) {
        const lastSentTime = new Date(lastCodeSentAt);
        const now = new Date();
        const timeDiff = now.getTime() - lastSentTime.getTime();
        const cooldownMs = SMS_OTP_CONFIG.cooldownMinutes * 60 * 1000;
        
        if (timeDiff < cooldownMs) {
          const remainingSeconds = Math.ceil((cooldownMs - timeDiff) / 1000);
          return {
            success: false,
            error: `Please wait ${remainingSeconds} seconds before requesting another code`
          };
        }
      }
    }

    // Generate and store test code
    const storeResult = await storeOtpCode({
      userId,
      tenantId,
      isTestCode: true
    });

    if (!storeResult.success || !storeResult.code) {
      return {
        success: false,
        error: storeResult.error || 'Failed to generate test code'
      };
    }

    // Create message content
    const message = `Your Auton verification code is: ${storeResult.code}\n\nThis code expires in ${SMS_OTP_CONFIG.expiryMinutes} minutes.`;

    // Send SMS using 2FA-specific sender with designated Auton phone number
    const smsResult = await send2faSms({
      toPhoneNumber: formattedPhone,
      messageBody: message
    });

    if (!smsResult.success) {
      return {
        success: false,
        error: smsResult.error || 'Failed to send verification code. Please try again.'
      };
    }

    console.log(` SMS OTP test code sent successfully to ${formattedPhone}`);

    return {
      success: true,
      testCodeSent: true
    };

  } catch (error: any) {
    console.error('Error sending SMS OTP test code:', error);
    return {
      success: false,
      error: `Failed to send test code: ${error.message}`
    };
  }
};