import { Request, Response } from 'express';
import { 
  enrollTotp, 
  verifyTotp, 
  getTotpStatus, 
  disableTotp, 
  generateBackupCodes 
} from '../services/totpService';

export const totpController = {
  // POST /api/2fa/totp/enroll
  enrollTotp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userEmail } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      // Validate required fields
      if (!userEmail) {
        res.status(400).json({
          success: false,
          error: 'User email is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Start TOTP enrollment
      const enrollmentResult = await enrollTotp({
        userId,
        tenantId,
        userEmail,
        appName: 'Pulseline'
      });

      if (!enrollmentResult.success) {
        res.status(400).json({
          success: false,
          error: enrollmentResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          qrCode: enrollmentResult.qrCodeDataUrl,
          setupKey: enrollmentResult.secret,
          backupCodes: enrollmentResult.backupCodes
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error enrolling TOTP:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to enroll TOTP',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/2fa/totp/verify-enrollment
  verifyEnrollment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify enrollment code
      const verificationResult = await verifyTotp({
        userId,
        tenantId,
        code,
        isEnrollment: true
      });

      if (!verificationResult.success) {
        res.status(500).json({
          success: false,
          error: verificationResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!verificationResult.valid) {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          enabled: true,
          backupCodes: verificationResult.backupCodes
        },
        message: 'TOTP enrollment completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error verifying TOTP enrollment:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to verify TOTP enrollment',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/2fa/totp/verify
  verifyTotp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, isBackupCode } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Code is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify TOTP code
      const verificationResult = await verifyTotp({
        userId,
        tenantId,
        code,
        isEnrollment: false,
        isBackupCode: isBackupCode || code.length === 8
      });

      if (!verificationResult.success) {
        res.status(500).json({
          success: false,
          error: verificationResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: verificationResult.valid
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error verifying TOTP code:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to verify TOTP code',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/2fa/totp/status
  getTotpStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get TOTP status
      const statusResult = await getTotpStatus({
        userId,
        tenantId
      });

      if (!statusResult.success) {
        res.status(500).json({
          success: false,
          error: statusResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          enabled: statusResult.enabled,
          enrolledAt: statusResult.enrolledAt,
          backupCodesRemaining: statusResult.backupCodesRemaining
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error getting TOTP status:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get TOTP status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/2fa/totp/disable
  disableTotp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationCode } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!verificationCode) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Disable TOTP
      const disableResult = await disableTotp({
        userId,
        tenantId,
        verificationCode
      });

      if (!disableResult.success) {
        res.status(400).json({
          success: false,
          error: disableResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'TOTP disabled successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error disabling TOTP:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to disable TOTP',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/2fa/totp/backup-codes/regenerate
  regenerateBackupCodes: async (req: Request, res: Response): Promise<void> => {
    try {
      const { verificationCode } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      if (!verificationCode) {
        res.status(400).json({
          success: false,
          error: 'Verification code is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate new backup codes
      const backupCodesResult = await generateBackupCodes({
        userId,
        tenantId,
        verificationCode
      });

      if (!backupCodesResult.success) {
        res.status(400).json({
          success: false,
          error: backupCodesResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          backupCodes: backupCodesResult.backupCodes
        },
        message: 'Backup codes regenerated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error regenerating backup codes:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate backup codes',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};