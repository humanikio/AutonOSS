import { firestore } from '../../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { getTotpSecurityRef } from '../../services/storageHelper';
import { generateOtpCode, hashOtpCode } from './generateOtpCode';
import { SMS_OTP_CONFIG } from '../models/smsOtpModels';

export interface StoreOtpCodeParams {
  userId: string;
  tenantId: string;
  isTestCode?: boolean;
}

export interface StoreOtpCodeResult {
  success: boolean;
  code?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Generates and stores an OTP code in Firestore
 */
export const storeOtpCode = async ({
  userId,
  tenantId,
  isTestCode = false
}: StoreOtpCodeParams): Promise<StoreOtpCodeResult> => {
  try {
    console.log(`📱 Generating ${isTestCode ? 'test' : 'regular'} SMS OTP code for user: ${userId}`);

    // Generate OTP code
    const code = generateOtpCode();
    const codeHash = hashOtpCode(code);
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + SMS_OTP_CONFIG.expiryMinutes);

    // Get security document reference
    const securityRef = getTotpSecurityRef(tenantId, userId);
    
    // Prepare the code entry
    const codeEntry = {
      [isTestCode ? 'code' : 'codeHash']: isTestCode ? code : codeHash,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString()
    };

    if (!isTestCode) {
      codeEntry['usedAt'] = '';
    }

    // Update the security document
    const fieldPath = isTestCode ? 'smsOtp.testCodes' : 'smsOtp.activeCodes';
    
    await securityRef.update({
      [fieldPath]: FieldValue.arrayUnion(codeEntry),
      'smsOtp.lastCodeSentAt': new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ SMS OTP code stored successfully for user: ${userId}`);

    return {
      success: true,
      code,
      expiresAt
    };

  } catch (error: any) {
    console.error('Error storing SMS OTP code:', error);
    return {
      success: false,
      error: `Failed to store SMS OTP code: ${error.message}`
    };
  }
};