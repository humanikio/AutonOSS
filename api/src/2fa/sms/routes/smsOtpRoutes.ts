import { Router } from 'express';
import { smsOtpController } from '../controllers/smsOtpController';
import { authenticateToken } from '../../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

/**
 * SMS OTP Setup Routes
 * Base path: /api/2fa/sms
 */

// POST /api/2fa/sms/setup
// Initiates SMS OTP setup by sending a test code to the provided phone number
router.post('/setup', smsOtpController.setupSmsOtp);

// POST /api/2fa/sms/setup-continue  
// Completes SMS OTP setup by verifying the test code and saving the configuration
router.post('/setup-continue', smsOtpController.setupContinue);

// GET /api/2fa/sms/status
// Gets the current SMS OTP status for the authenticated user
router.get('/status', smsOtpController.getStatus);

export { router as smsOtpRoutes };