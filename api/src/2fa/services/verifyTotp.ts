import { authenticator } from 'otplib';
import { firestore } from '../../config/firebase';
import { encryptionService } from './encryptionService';
import { getTotpSecurityRef } from './storageHelper';
import { 
  TotpVerificationParams, 
  TotpVerificationResult, 
  UserSecurityData,
  TOTP_CONFIG
} from '../models/totpModels';

export const verifyTotp = async ({
  userId,
  tenantId,
  code,
  isEnrollment = false,
  isBackupCode = false
}: TotpVerificationParams): Promise<TotpVerificationResult> => {
  try {
    console.log(`🔍 Verifying TOTP code for user: ${userId} in tenant: ${tenantId}`);
    console.log(`  - Is enrollment: ${isEnrollment}`);
    console.log(`  - Is backup code: ${isBackupCode}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // Get user security data
    const securityRef = getTotpSecurityRef(tenantId, userId);

    const securityDoc = await securityRef.get();
    if (!securityDoc.exists) {
      return {
        success: false,
        error: 'TOTP not enrolled for this user'
      };
    }

    const securityData = securityDoc.data() as UserSecurityData;
    if (!securityData.totp) {
      return {
        success: false,
        error: 'TOTP configuration not found'
      };
    }

    // Check if TOTP is enabled (unless this is enrollment verification)
    if (!isEnrollment && !securityData.totp.enabled) {
      return {
        success: false,
        error: 'TOTP is not enabled for this user'
      };
    }

    let isValid = false;
    let backupCodes: string[] | undefined;

    if (isBackupCode) {
      // Verify backup code
      const codeHash = encryptionService.hashBackupCode(code.toUpperCase());
      const backupCode = securityData.totp.backupCodes.find(
        bc => bc.codeHash === codeHash && !bc.used
      );

      if (backupCode) {
        isValid = true;
        
        // Mark backup code as used
        const updatedBackupCodes = securityData.totp.backupCodes.map(bc =>
          bc.codeHash === codeHash
            ? { ...bc, used: true, usedAt: new Date().toISOString() }
            : bc
        );

        await securityRef.update({
          'totp.backupCodes': updatedBackupCodes,
          'totp.lastUsedAt': new Date().toISOString(),
          'updatedAt': new Date().toISOString()
        });

        console.log(`✅ Backup code verified and marked as used for user: ${userId}`);
      } else {
        console.log(`❌ Invalid or already used backup code for user: ${userId}`);
      }
    } else {
      // Verify TOTP code
      try {
        const secret = encryptionService.decrypt(securityData.totp.secretEncrypted);
        
        // Configure otplib
        authenticator.options = {
          digits: TOTP_CONFIG.digits,
          step: TOTP_CONFIG.period,
          window: TOTP_CONFIG.window
        };

        // Get current timestamp to prevent replay attacks
        const currentTimestamp = Math.floor(Date.now() / 1000 / TOTP_CONFIG.period);
        
        // Check if this timestamp was already used (replay protection)
        if (!isEnrollment && securityData.totp.lastTimestamp && 
            currentTimestamp <= securityData.totp.lastTimestamp) {
          console.log(`🚫 Replay attack detected for user: ${userId} - timestamp already used`);
          return {
            success: true,
            valid: false,
            error: 'Code already used'
          };
        }

        // Verify the code
        isValid = authenticator.check(code, secret);

        if (isValid) {
          const updateData: any = {
            'totp.lastUsedAt': new Date().toISOString(),
            'totp.lastTimestamp': currentTimestamp,
            'updatedAt': new Date().toISOString()
          };

          // If this is enrollment verification, enable TOTP
          if (isEnrollment) {
            updateData['totp.enabled'] = true;
            
            // Generate fresh backup codes to return to user
            backupCodes = [];
            const backupCodeHashes: Array<{ codeHash: string; used: boolean }> = [];
            
            for (let i = 0; i < 8; i++) {
              const backupCode = encryptionService.generateBackupCode();
              backupCodes.push(backupCode);
              backupCodeHashes.push({
                codeHash: encryptionService.hashBackupCode(backupCode),
                used: false
              });
            }
            
            updateData['totp.backupCodes'] = backupCodeHashes;
            console.log(`🎉 TOTP enrollment completed for user: ${userId}`);
          }

          await securityRef.update(updateData);
          console.log(`✅ TOTP code verified for user: ${userId}`);
        } else {
          console.log(`❌ Invalid TOTP code for user: ${userId}`);
        }
        
      } catch (decryptionError) {
        console.error('Error decrypting TOTP secret:', decryptionError);
        return {
          success: false,
          error: 'Failed to verify TOTP code'
        };
      }
    }

    return {
      success: true,
      valid: isValid,
      backupCodes: isEnrollment && isValid ? backupCodes : undefined
    };

  } catch (error: any) {
    console.error('Error verifying TOTP:', error);
    return {
      success: false,
      error: `Failed to verify TOTP: ${error.message}`
    };
  }
};