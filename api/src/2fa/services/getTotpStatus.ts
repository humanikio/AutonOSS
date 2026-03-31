import { firestore } from '../../config/firebase';
import { getTotpSecurityRef } from './storageHelper';
import { 
  TotpStatusParams, 
  TotpStatusResult, 
  UserSecurityData
} from '../models/totpModels';

export const getTotpStatus = async ({
  userId,
  tenantId
}: TotpStatusParams): Promise<TotpStatusResult> => {
  try {
    console.log(`📊 Getting TOTP status for user: ${userId} in tenant: ${tenantId}`);
    console.log(`👤 User type: ${tenantId === userId ? 'Root user' : 'Sub user'}`);

    // Get user security data
    const securityRef = getTotpSecurityRef(tenantId, userId);

    const securityDoc = await securityRef.get();
    
    if (!securityDoc.exists) {
      return {
        success: true,
        enabled: false,
        backupCodesRemaining: 0
      };
    }

    const securityData = securityDoc.data() as UserSecurityData;
    
    if (!securityData.totp) {
      return {
        success: true,
        enabled: false,
        backupCodesRemaining: 0
      };
    }

    // Count unused backup codes
    const backupCodesRemaining = securityData.totp.backupCodes?.filter(
      bc => !bc.used
    ).length || 0;

    console.log(`✅ TOTP status retrieved for user: ${userId}`);
    console.log(`  - Enabled: ${securityData.totp.enabled}`);
    console.log(`  - Backup codes remaining: ${backupCodesRemaining}`);

    return {
      success: true,
      enabled: securityData.totp.enabled || false,
      enrolledAt: securityData.totp.enrolledAt,
      backupCodesRemaining
    };

  } catch (error: any) {
    console.error('Error getting TOTP status:', error);
    return {
      success: false,
      error: `Failed to get TOTP status: ${error.message}`
    };
  }
};