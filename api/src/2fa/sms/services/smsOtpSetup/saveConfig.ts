import { getTotpSecurityRef } from '../../../services/storageHelper';
import { encryptionService } from '../../../services/encryptionService';
import { verifyPhoneFormat } from './verifyPhoneFormat';
import { verifyTestNumber } from './verifyTestNumber';
import { 
  SmsOtpVerifyTestParams, 
  SmsOtpVerifyTestResult,
  SmsOtpData
} from '../../models/smsOtpModels';

/**
 * Saves SMS OTP configuration after successful test code verification
 */
export const saveConfig = async ({
  userId,
  tenantId,
  phoneNumber,
  testCode
}: SmsOtpVerifyTestParams): Promise<SmsOtpVerifyTestResult> => {
  try {
    console.log(`💾 Saving SMS OTP config for user: ${userId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // First verify the test code
    const verificationResult = await verifyTestNumber({
      userId,
      tenantId,
      phoneNumber,
      testCode
    });

    if (!verificationResult.success || !verificationResult.verified) {
      return verificationResult;
    }

    // Validate phone number format
    const phoneValidation = verifyPhoneFormat(phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.error
      };
    }

    const formattedPhone = phoneValidation.formattedNumber!;

    // Encrypt the phone number for storage
    const encryptedPhoneNumber = encryptionService.encrypt(formattedPhone);

    // Get security document reference
    const securityRef = getTotpSecurityRef(tenantId, userId);
    const securityDoc = await securityRef.get();

    const now = new Date().toISOString();

    // Create SMS OTP configuration
    const smsOtpConfig: SmsOtpData = {
      enabled: true,
      phoneNumber: encryptedPhoneNumber,
      enrolledAt: now,
      lastCodeSentAt: undefined,
      lastUsedAt: undefined,
      testCodes: [], // Clear test codes after successful setup
      activeCodes: []
    };

    if (securityDoc.exists) {
      // Update existing security document
      const existingData = securityDoc.data();
      await securityRef.update({
        smsOtp: smsOtpConfig,
        updatedAt: now
      });
    } else {
      // Create new security document
      await securityRef.set({
        smsOtp: smsOtpConfig,
        createdAt: now,
        updatedAt: now
      });
    }

    console.log(` SMS OTP configuration saved successfully for user: ${userId}`);
    console.log(`=� Phone number encrypted and stored: ${formattedPhone.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, '$1***-***-$4')}`);

    return {
      success: true,
      verified: true
    };

  } catch (error: any) {
    console.error('Error saving SMS OTP configuration:', error);
    return {
      success: false,
      error: `Failed to save SMS OTP configuration: ${error.message}`
    };
  }
};