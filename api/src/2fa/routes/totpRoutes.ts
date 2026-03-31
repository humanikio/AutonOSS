import { Router } from 'express';
import { totpController } from '../controllers/totpController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// POST /api/2fa/totp/enroll - Start TOTP enrollment (generate QR code)
router.post('/enroll', totpController.enrollTotp);

// POST /api/2fa/totp/verify-enrollment - Complete TOTP enrollment (verify first code)
router.post('/verify-enrollment', totpController.verifyEnrollment);

// POST /api/2fa/totp/verify - Verify TOTP code during login or operations
router.post('/verify', totpController.verifyTotp);

// GET /api/2fa/totp/status - Get user's TOTP status
router.get('/status', totpController.getTotpStatus);

// POST /api/2fa/totp/disable - Disable TOTP for user
router.post('/disable', totpController.disableTotp);

// POST /api/2fa/totp/backup-codes/regenerate - Regenerate backup codes
router.post('/backup-codes/regenerate', totpController.regenerateBackupCodes);

export { router as totpRoutes };