import express from 'express';
import { authenticateEither } from '../../middleware/authenticateEither';
import { emailAccountsController } from '../controllers/emailAccountsController';

const router = express.Router();

router.use(authenticateEither);

// ============================================================
// ACCOUNT ENDPOINTS
// ============================================================

/**
 * GET /api/email-accounts
 * List all email accounts for a tenant
 *
 * Query:
 * - tenantId: string (required)
 */
router.get('/', emailAccountsController.listAccounts.bind(emailAccountsController));

/**
 * GET /api/email-accounts/:accountId
 * Get a specific email account
 *
 * Params:
 * - accountId: string
 * Query:
 * - tenantId: string (required)
 */
router.get('/:accountId', emailAccountsController.getAccount.bind(emailAccountsController));

/**
 * POST /api/email-accounts
 * Create an email account (Mailgun only)
 *
 * Body:
 * - tenantId: string (required)
 * - provider: 'mailgun' (required)
 * - name: string (optional - defaults to "Auton Email")
 */
router.post('/', emailAccountsController.createAccount.bind(emailAccountsController));

/**
 * DELETE /api/email-accounts/:accountId
 * Remove an email account
 *
 * Params:
 * - accountId: string
 * Body:
 * - tenantId: string (required)
 */
router.delete('/:accountId', emailAccountsController.removeAccount.bind(emailAccountsController));

/**
 * PATCH /api/email-accounts/:accountId
 * Update an email account (e.g., change display name or email address)
 *
 * Params:
 * - accountId: string
 * Body:
 * - tenantId: string (required)
 * - name: string (optional - display name)
 * - email: string (optional - email address, Mailgun only)
 */
router.patch('/:accountId', emailAccountsController.updateAccount.bind(emailAccountsController));

/**
 * POST /api/email-accounts/:accountId/sync
 * Toggle sync status for an account
 *
 * Params:
 * - accountId: string
 * Body:
 * - tenantId: string (required)
 * - syncEnabled: boolean (required)
 */
router.post('/:accountId/sync', emailAccountsController.toggleSync.bind(emailAccountsController));

// ============================================================
// CONFIG ENDPOINTS
// ============================================================

/**
 * GET /api/email-accounts/config
 * Get email configuration
 *
 * Query:
 * - tenantId: string (required)
 */
router.get('/config', emailAccountsController.getConfig.bind(emailAccountsController));

/**
 * PUT /api/email-accounts/config
 * Update email configuration
 *
 * Body:
 * - tenantId: string (required)
 * - ... other config fields
 */
router.put('/config', emailAccountsController.updateConfig.bind(emailAccountsController));

/**
 * POST /api/email-accounts/config/default
 * Set default email account
 *
 * Body:
 * - tenantId: string (required)
 * - accountId: string (required)
 */
router.post('/config/default', emailAccountsController.setDefaultAccount.bind(emailAccountsController));

export default router;
