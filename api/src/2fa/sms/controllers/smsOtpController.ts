import { Request, Response } from 'express';
import { 
  sendTestCode, 
  saveConfig 
} from '../services/smsOtpSetup';
import { getSmsOtpStatus } from '../services/getSmsOtpStatus';

export const smsOtpController = {
  // POST /api/2fa/sms/setup
  setupSmsOtp: async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      // Validate required fields
      if (!phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required',
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

      // Send test code
      const setupResult = await sendTestCode({
        userId,
        tenantId,
        phoneNumber
      });

      if (!setupResult.success) {
        res.status(400).json({
          success: false,
          error: setupResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          testCodeSent: setupResult.testCodeSent
        },
        message: 'Verification code sent successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error setting up SMS OTP:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to setup SMS OTP',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // POST /api/2fa/sms/setup-continue
  setupContinue: async (req: Request, res: Response): Promise<void> => {
    try {
      const { phoneNumber, testCode } = req.body;
      const tenantId = req.tenantId;
      const userId = req.user?.uid;

      // Validate required fields
      if (!phoneNumber || !testCode) {
        res.status(400).json({
          success: false,
          error: 'Phone number and verification code are required',
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

      // Verify test code and save configuration
      const saveResult = await saveConfig({
        userId,
        tenantId,
        phoneNumber,
        testCode
      });

      if (!saveResult.success) {
        res.status(400).json({
          success: false,
          error: saveResult.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!saveResult.verified) {
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
          enabled: true,
          verified: saveResult.verified
        },
        message: 'SMS OTP setup completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error completing SMS OTP setup:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to complete SMS OTP setup',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  // GET /api/2fa/sms/status
  getStatus: async (req: Request, res: Response): Promise<void> => {
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

      // Get SMS OTP status
      const statusResult = await getSmsOtpStatus({
        userId,
        tenantId
      });

      if (!statusResult.success) {
        res.status(400).json({
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
          phoneNumber: statusResult.phoneNumber,
          enrolledAt: statusResult.enrolledAt
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Error getting SMS OTP status:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get SMS OTP status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};