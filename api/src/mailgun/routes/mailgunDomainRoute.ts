import express from 'express';
import { authenticateEither } from '../../middleware/authenticateEither';
import { mailgunDomainController } from '../controllers/mailgunDomainController';

const router = express.Router();

router.use(authenticateEither);

// ============================================================
// MAILGUN DOMAIN ENDPOINTS
// ============================================================

/**
 * GET /api/mailgun/domains
 * List all Mailgun domains for a tenant
 *
 * Query:
 * - tenantId: string (required)
 * - state: 'unverified' | 'active' | 'disabled' (optional)
 * - status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled' (optional)
 */
router.get('/', mailgunDomainController.listDomains.bind(mailgunDomainController));

/**
 * POST /api/mailgun/domains
 * Create a new Mailgun domain
 *
 * Body:
 * - tenantId: string (required)
 * - domainId: string (required) - Domain name (e.g., "mybusiness.com")
 * - smtpPassword: string (optional)
 * - spamAction: 'disabled' | 'tag' | 'block' (optional)
 * - wildcard: boolean (optional)
 * - useAutomaticSenderSecurity: boolean (optional)
 * - requireTls: boolean (optional)
 * - webScheme: 'http' | 'https' (optional)
 */
router.post('/', mailgunDomainController.createDomain.bind(mailgunDomainController));

/**
 * GET /api/mailgun/domains/:domainId
 * Get a specific Mailgun domain
 *
 * Params:
 * - domainId: string (domain name)
 * Query:
 * - tenantId: string (required)
 */
router.get('/:domainId', mailgunDomainController.getDomain.bind(mailgunDomainController));

/**
 * PUT /api/mailgun/domains/:domainId
 * Update Mailgun domain settings
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 * - smtpPassword: string (optional)
 * - spamAction: 'disabled' | 'tag' | 'block' (optional)
 * - wildcard: boolean (optional)
 * - requireTls: boolean (optional)
 * - skipVerification: boolean (optional)
 * - webScheme: 'http' | 'https' (optional)
 * - webPrefix: string (optional)
 */
router.put('/:domainId', mailgunDomainController.updateDomain.bind(mailgunDomainController));

/**
 * DELETE /api/mailgun/domains/:domainId
 * Remove a Mailgun domain
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 */
router.delete('/:domainId', mailgunDomainController.deleteDomain.bind(mailgunDomainController));

/**
 * POST /api/mailgun/domains/:domainId/verify
 * Verify domain DNS records
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 */
router.post('/:domainId/verify', mailgunDomainController.verifyDomain.bind(mailgunDomainController));

/**
 * POST /api/mailgun/domains/:domainId/sync
 * Sync domain data from Mailgun API
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 */
router.post('/:domainId/sync', mailgunDomainController.syncDomain.bind(mailgunDomainController));

export default router;
