import { db } from '../../../config/firestore';
import { getDomain } from './getDomain';

/**
 * Remove a domain
 *
 * Note: This does NOT remove connections to services like Mailgun.
 * Those should be removed first.
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 */
export async function removeDomain(tenantId: string, domainId: string): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('domains')
    .doc(domainId);

  // Verify domain exists
  const domain = await getDomain(tenantId, domainId);
  if (!domain) {
    throw new Error(`Domain ${domainId} not found`);
  }

  // Check if domain has active connections
  const hasConnections = Object.values(domain.connections).some(connected => connected === true);
  if (hasConnections) {
    const activeConnections = Object.keys(domain.connections).filter(
      key => domain.connections[key as keyof typeof domain.connections] === true
    );
    throw new Error(
      `Cannot remove domain with active connections. ` +
      `Please disconnect from: ${activeConnections.join(', ')}`
    );
  }

  await docRef.delete();

  console.log(`[DOMAIN] Removed domain ${domainId}`);
}
