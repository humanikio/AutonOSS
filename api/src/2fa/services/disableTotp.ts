import { firestore } from '../../config/firebase';
import { verifyTotp } from './verifyTotp';
import { getTotpSecurityRef } from './storageHelper';
import { 
  TotpDisableParams, 
  TotpDisableResult
} from '../models/totpModels';

export const disableTotp = async ({
  userId,
  tenantId,
  verificationCode
}: TotpDisableParams): Promise<TotpDisableResult> => {
  try {
    console.log(`🔓 Disabling TOTP for user: ${userId} in tenant: ${tenantId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // First verify the current TOTP code
    const verificationResult = await verifyTotp({
      userId,
      tenantId,
      code: verificationCode,
      isEnrollment: false,
      isBackupCode: verificationCode.length === 8 // Backup codes are 8 characters
    });

    if (!verificationResult.success || !verificationResult.valid) {
      return {
        success: false,
        error: 'Invalid verification code. Please provide a valid TOTP code or backup code.'
      };
    }

    // Delete the TOTP security document
    const securityRef = getTotpSecurityRef(tenantId, userId);

    await securityRef.delete();

    console.log(`✅ TOTP disabled and security data removed for user: ${userId}`);

    return {
      success: true
    };

  } catch (error: any) {
    console.error('Error disabling TOTP:', error);
    return {
      success: false,
      error: `Failed to disable TOTP: ${error.message}`
    };
  }
};