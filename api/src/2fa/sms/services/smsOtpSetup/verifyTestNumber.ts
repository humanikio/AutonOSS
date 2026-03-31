import { getTotpSecurityRef } from '../../../services/storageHelper';
import { verifyPhoneFormat } from './verifyPhoneFormat';
import { 
  SmsOtpVerifyTestParams, 
  SmsOtpVerifyTestResult
} from '../../models/smsOtpModels';

/**
 * Verifies the test code sent to the phone number during SMS OTP setup
 */
export const verifyTestNumber = async ({
  userId,
  tenantId,
  phoneNumber,
  testCode
}: SmsOtpVerifyTestParams): Promise<SmsOtpVerifyTestResult> => {
  try {
    console.log(`= Verifying SMS OTP test code for user: ${userId}`);

    // Validate inputs
    if (!testCode || testCode.length !== 6) {
      return {
        success: false,
        error: 'Please enter a 6-digit verification code'
      };
    }

    // Validate phone number format
    const phoneValidation = verifyPhoneFormat(phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.error
      };
    }

    // Get security document
    const securityRef = getTotpSecurityRef(tenantId, userId);
    const securityDoc = await securityRef.get();

    if (!securityDoc.exists) {
      return {
        success: false,
        error: 'No test code found. Please request a new verification code.'
      };
    }

    const securityData = securityDoc.data();
    const testCodes = securityData?.smsOtp?.testCodes || [];

    if (testCodes.length === 0) {
      return {
        success: false,
        error: 'No test code found. Please request a new verification code.'
      };
    }

    // Find valid, unused test code
    const now = new Date();
    let validCodeFound = false;
    let codeIndex = -1;

    for (let i = 0; i < testCodes.length; i++) {
      const codeEntry = testCodes[i];
      
      // Skip used codes
      if (codeEntry.used) {
        continue;
      }

      // Skip expired codes
      const expiresAt = new Date(codeEntry.expiresAt);
      if (now > expiresAt) {
        continue;
      }

      // Check if code matches
      if (codeEntry.code === testCode) {
        validCodeFound = true;
        codeIndex = i;
        break;
      }
    }

    if (!validCodeFound) {
      return {
        success: false,
        verified: false,
        error: 'Invalid or expired verification code'
      };
    }

    // Mark the code as used
    testCodes[codeIndex].used = true;
    testCodes[codeIndex].usedAt = now.toISOString();

    // Update the document
    await securityRef.update({
      'smsOtp.testCodes': testCodes,
      updatedAt: now.toISOString()
    });

    console.log(` SMS OTP test code verified successfully for user: ${userId}`);

    return {
      success: true,
      verified: true
    };

  } catch (error: any) {
    console.error('Error verifying SMS OTP test code:', error);
    return {
      success: false,
      error: `Failed to verify test code: ${error.message}`
    };
  }
};