import express from 'express';
import { authenticateEither } from '../../middleware/authenticateEither';
import { domainController } from '../controllers/domainController';

const router = express.Router();

router.use(authenticateEither);

// ============================================================
// BASE DOMAIN ENDPOINTS
// ============================================================

/**
 * GET /api/domains
 * List all domains for a tenant
 *
 * Query:
 * - tenantId: string (required)
 * - verified: boolean (optional)
 * - isPrimary: boolean (optional)
 * - hasConnection: 'mailgun' (optional)
 */
router.get('/', domainController.listDomains.bind(domainController));

/**
 * POST /api/domains
 * Create a new domain
 *
 * Body:
 * - tenantId: string (required)
 * - domainId: string (required) - Domain name (e.g., "mybusiness.com")
 * - displayName: string (optional)
 * - description: string (optional)
 * - isPrimary: boolean (optional)
 * - verificationMethod: 'dns-txt' | 'manual' (optional, defaults to 'dns-txt')
 */
router.post('/', domainController.createDomain.bind(domainController));

/**
 * GET /api/domains/:domainId
 * Get a specific domain
 *
 * Params:
 * - domainId: string (domain name)
 * Query:
 * - tenantId: string (required)
 */
router.get('/:domainId', domainController.getDomain.bind(domainController));

/**
 * PATCH /api/domains/:domainId
 * Update domain metadata
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 * - displayName: string (optional)
 * - description: string (optional)
 * - isPrimary: boolean (optional)
 * - verification: Partial<DomainVerification> (optional)
 * - connections: Partial<DomainConnections> (optional)
 */
router.patch('/:domainId', domainController.updateDomain.bind(domainController));

/**
 * DELETE /api/domains/:domainId
 * Remove a domain
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 *
 * Note: Requires all service connections to be removed first
 */
router.delete('/:domainId', domainController.deleteDomain.bind(domainController));

/**
 * POST /api/domains/:domainId/verify
 * Verify domain ownership
 *
 * Params:
 * - domainId: string (domain name)
 * Body:
 * - tenantId: string (required)
 */
router.post('/:domainId/verify', domainController.verifyDomain.bind(domainController));

export default router;
