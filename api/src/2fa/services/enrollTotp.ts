import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { firestore } from '../../config/firebase';
import { encryptionService } from './encryptionService';
import { getTotpSecurityRef } from './storageHelper';
import { 
  TotpEnrollmentParams, 
  TotpEnrollmentResult, 
  UserSecurityData,
  TOTP_CONFIG,
  BACKUP_CODES_COUNT
} from '../models/totpModels';

export const enrollTotp = async ({
  userId,
  tenantId,
  userEmail,
  appName = 'Pulseline'
}: TotpEnrollmentParams): Promise<TotpEnrollmentResult> => {
  try {
    console.log(`🔐 Starting TOTP enrollment for user: ${userId} in tenant: ${tenantId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // Check if user already has TOTP enabled
    const securityRef = getTotpSecurityRef(tenantId, userId);

    const existingDoc = await securityRef.get();
    if (existingDoc.exists && existingDoc.data()?.totp?.enabled) {
      return {
        success: false,
        error: 'TOTP is already enabled for this user'
      };
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    console.log(`✅ Generated TOTP secret for user: ${userId}`);

    // Create otpauth URI - use "Auton" as both account and issuer name
    const otpauthUrl = authenticator.keyuri(
      'Auton', // Account name (shows in authenticator)
      'Auton', // Issuer name  
      secret
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Generate backup codes
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

    // Encrypt the secret before storing
    const encryptedSecret = encryptionService.encrypt(secret);

    // Store enrollment data (not yet enabled)
    const securityData: UserSecurityData = {
      totp: {
        enabled: false, // Will be enabled after verification
        secretEncrypted: encryptedSecret,
        enrolledAt: new Date().toISOString(),
        backupCodes: backupCodeHashes
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await securityRef.set(securityData);

    console.log(`✅ TOTP enrollment data stored for user: ${userId}`);
    console.log(`📱 Generated ${backupCodes.length} backup codes`);

    return {
      success: true,
      qrCodeDataUrl,
      secret, // Only for testing/debugging - remove in production
      backupCodes
    };

  } catch (error: any) {
    console.error('Error enrolling TOTP:', error);
    return {
      success: false,
      error: `Failed to enroll TOTP: ${error.message}`
    };
  }
};