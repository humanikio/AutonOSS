import { addDomain } from './mailgunDomainManager/addDomain';
import { getDomain } from './mailgunDomainManager/getDomain';
import { getDomains } from './mailgunDomainManager/getDomains';
import { updateDomain } from './mailgunDomainManager/updateDomain';
import { removeDomain } from './mailgunDomainManager/removeDomain';
import { verifyDomain } from './mailgunDomainManager/verifyDomain';

/**
 * Mailgun Domain Manager
 *
 * Service for managing custom Mailgun domains
 * Firestore path: tenants/{tenantId}/mailgun/config/domains/{domainId}
 */
export const mailgunDomainManager = {
  /**
   * Create a new Mailgun domain
   * Calls Mailgun API and stores domain + DNS records in Firestore
   */
  addDomain,

  /**
   * Get a specific domain for a tenant
   */
  getDomain,

  /**
   * Get all domains for a tenant (optionally filtered)
   */
  getDomains,

  /**
   * Get only active/verified domains
   */
  getActiveDomains: (tenantId: string) =>
    getDomains(tenantId, { state: 'active', status: 'active' }),

  /**
   * Update domain settings
   * Updates both Mailgun API and Firestore
   */
  updateDomain,

  /**
   * Remove a domain
   * Deletes from both Mailgun API and Firestore
   */
  removeDomain,

  /**
   * Verify domain DNS records via Mailgun API
   * Checks all DNS records and updates verification status
   */
  verifyDomain
};

// Export types
export * from './mailgunDomainManager/types';
