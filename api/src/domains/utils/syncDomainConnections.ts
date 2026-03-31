import { domainManager } from '../services/domainManager';

/**
 * Helper utilities for syncing domain connections with service layers
 *
 * These functions ensure the base domain layer stays in sync with
 * service-specific domains (Mailgun, etc.)
 */

/**
 * Mark a domain as connected to Mailgun
 *
 * Call this after successfully creating a Mailgun domain
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name
 */
export async function connectDomainToMailgun(
  tenantId: string,
  domainId: string
): Promise<void> {
  console.log(`[DOMAIN_SYNC] Connecting ${domainId} to Mailgun`);

  await domainManager.updateDomain(tenantId, domainId, {
    connections: { mailgun: true }
  });

  console.log(`[DOMAIN_SYNC] ${domainId} connected to Mailgun`);
}

/**
 * Mark a domain as disconnected from Mailgun
 *
 * Call this after removing a Mailgun domain
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name
 */
export async function disconnectDomainFromMailgun(
  tenantId: string,
  domainId: string
): Promise<void> {
  console.log(`[DOMAIN_SYNC] Disconnecting ${domainId} from Mailgun`);

  await domainManager.updateDomain(tenantId, domainId, {
    connections: { mailgun: false }
  });

  console.log(`[DOMAIN_SYNC] ${domainId} disconnected from Mailgun`);
}

// Future: connectDomainToVercel, disconnectDomainFromVercel, etc.

/**
 * Check if a domain exists and is verified before connecting to a service
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name
 * @param requireVerified - Whether to require verification (default: true)
 * @throws Error if domain doesn't exist or isn't verified
 */
export async function validateDomainForConnection(
  tenantId: string,
  domainId: string,
  requireVerified: boolean = true
): Promise<void> {
  const domain = await domainManager.getDomain(tenantId, domainId);

  if (!domain) {
    throw new Error(
      `Domain ${domainId} not found. Please add it to your domains first at /api/domains`
    );
  }

  if (requireVerified && domain.verification.status !== 'verified') {
    throw new Error(
      `Domain ${domainId} is not verified. Please verify it first at /api/domains/${domainId}/verify`
    );
  }
}

/**
 * Get all domains connected to a specific service
 *
 * @param tenantId - Tenant ID
 * @param service - Service name (currently only 'mailgun')
 * @returns Array of domain names
 */
export async function getConnectedDomains(
  tenantId: string,
  service: 'mailgun'
): Promise<string[]> {
  const domains = await domainManager.getDomainsWithConnection(tenantId, service);
  return domains.map(d => d.domainId);
}
