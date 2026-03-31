import { firestore } from '../../config/firebase';
import { verifyTotp } from './verifyTotp';
import { encryptionService } from './encryptionService';
import { getTotpSecurityRef } from './storageHelper';
import { 
  BackupCodesParams, 
  BackupCodesResult, 
  UserSecurityData,
  BACKUP_CODES_COUNT
} from '../models/totpModels';

export const generateBackupCodes = async ({
  userId,
  tenantId,
  verificationCode
}: BackupCodesParams): Promise<BackupCodesResult> => {
  try {
    console.log(`🔄 Regenerating backup codes for user: ${userId} in tenant: ${tenantId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // Verify the current TOTP code if provided
    if (verificationCode) {
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
    }

    // Get current security data
    const securityRef = getTotpSecurityRef(tenantId, userId);

    const securityDoc = await securityRef.get();
    if (!securityDoc.exists) {
      return {
        success: false,
        error: 'TOTP not enrolled for this user'
      };
    }

    const securityData = securityDoc.data() as UserSecurityData;
    if (!securityData.totp || !securityData.totp.enabled) {
      return {
        success: false,
        error: 'TOTP is not enabled for this user'
      };
    }

    // Generate new backup codes
    const backupCodes: string[] = [];
    const backupCodeHashes: Array<{ codeHash: string; used: boolean }> = [];
    
    for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
      const code = encryptionService.generateBackupCode();
      backupCodes.push(code);
      backupCodeHashes.push({
        codeHash: encryptionService.hashBackupCode(code),
        used: false
      });
    }

    // Update security data with new backup codes
    await securityRef.update({
      'totp.backupCodes': backupCodeHashes,
      'updatedAt': new Date().toISOString()
    });

    console.log(`✅ Generated ${backupCodes.length} new backup codes for user: ${userId}`);

    return {
      success: true,
      backupCodes
    };

  } catch (error: any) {
    console.error('Error generating backup codes:', error);
    return {
      success: false,
      error: `Failed to generate backup codes: ${error.message}`
    };
  }
};