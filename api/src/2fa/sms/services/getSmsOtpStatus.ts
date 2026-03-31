import { getTotpSecurityRef } from '../../services/storageHelper';
import { encryptionService } from '../../services/encryptionService';
import { maskPhoneNumber } from './smsOtpSetup/verifyPhoneFormat';
import { 
  SmsOtpStatusParams, 
  SmsOtpStatusResult
} from '../models/smsOtpModels';

/**
 * Gets the SMS OTP status for a user from the security document
 */
export const getSmsOtpStatus = async ({
  userId,
  tenantId
}: SmsOtpStatusParams): Promise<SmsOtpStatusResult> => {
  try {
    console.log(`🔍 Getting SMS OTP status for user: ${userId} in tenant: ${tenantId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // Get security document reference
    const securityRef = getTotpSecurityRef(tenantId, userId);
    const securityDoc = await securityRef.get();

    if (!securityDoc.exists) {
      console.log(`📄 No security document found for user: ${userId}`);
      return {
        success: true,
        enabled: false,
        phoneNumber: null,
        enrolledAt: null
      };
    }

    const securityData = securityDoc.data();
    const smsOtpData = securityData?.smsOtp;

    if (!smsOtpData) {
      console.log(`📱 No SMS OTP configuration found for user: ${userId}`);
      return {
        success: true,
        enabled: false,
        phoneNumber: null,
        enrolledAt: null
      };
    }

    // Check if SMS OTP is enabled
    if (!smsOtpData.enabled) {
      console.log(`❌ SMS OTP is disabled for user: ${userId}`);
      return {
        success: true,
        enabled: false,
        phoneNumber: null,
        enrolledAt: smsOtpData.enrolledAt || null
      };
    }

    // Decrypt and mask the phone number for display
    let maskedPhoneNumber = null;
    if (smsOtpData.phoneNumber) {
      try {
        const decryptedPhone = encryptionService.decrypt(smsOtpData.phoneNumber);
        maskedPhoneNumber = maskPhoneNumber(decryptedPhone);
        console.log(`📞 Found SMS OTP phone number: ${maskedPhoneNumber}`);
      } catch (decryptError) {
        console.error('Error decrypting phone number:', decryptError);
        maskedPhoneNumber = '***-***-****'; // Fallback masked format
      }
    }

    console.log(`✅ SMS OTP status retrieved successfully for user: ${userId}`);
    console.log(`   📱 Enabled: ${smsOtpData.enabled}`);
    console.log(`   📞 Phone: ${maskedPhoneNumber}`);
    console.log(`   📅 Enrolled: ${smsOtpData.enrolledAt}`);

    return {
      success: true,
      enabled: smsOtpData.enabled,
      phoneNumber: maskedPhoneNumber,
      enrolledAt: smsOtpData.enrolledAt || null
    };

  } catch (error: any) {
    console.error('Error getting SMS OTP status:', error);
    return {
      success: false,
      enabled: false,
      phoneNumber: null,
      enrolledAt: null,
      error: `Failed to get SMS OTP status: ${error.message}`
    };
  }
};