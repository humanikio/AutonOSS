import { createDomain } from './domainManager/createDomain';
import { getDomain } from './domainManager/getDomain';
import { getDomains } from './domainManager/getDomains';
import { updateDomain } from './domainManager/updateDomain';
import { removeDomain } from './domainManager/removeDomain';
import { verifyDomain } from './domainManager/verifyDomain';

/**
 * Domain Manager
 *
 * Universal domain management service for tracking domain ownership
 * and connections to various services (Mailgun, Vercel, etc.)
 *
 * Firestore path: tenants/{tenantId}/domains/{domainId}
 */
export const domainManager = {
  /**
   * Create a new domain record
   * Generates verification token for DNS TXT verification
   */
  createDomain,

  /**
   * Get a specific domain for a tenant
   */
  getDomain,

  /**
   * Get all domains for a tenant (optionally filtered)
   */
  getDomains,

  /**
   * Get only verified domains
   */
  getVerifiedDomains: (tenantId: string) =>
    getDomains(tenantId, { verified: true }),

  /**
   * Get domains connected to a specific service
   */
  getDomainsWithConnection: (tenantId: string, service: 'mailgun') =>
    getDomains(tenantId, { hasConnection: service }),

  /**
   * Update domain metadata or connections
   */
  updateDomain,

  /**
   * Remove a domain
   * Requires all service connections to be removed first
   */
  removeDomain,

  /**
   * Verify domain ownership
   * Checks DNS TXT record or other verification methods
   */
  verifyDomain
};

// Export types
export * from './domainManager/types';
