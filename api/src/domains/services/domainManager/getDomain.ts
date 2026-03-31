import { db } from '../../../config/firestore';
import { Domain } from './types';

/**
 * Get a specific domain for a tenant
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @returns Domain data or null if not found
 */
export async function getDomain(tenantId: string, domainId: string): Promise<Domain | null> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('domains')
    .doc(domainId);

  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  if (!data) {
    return null;
  }

  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    verification: {
      ...data.verification,
      verifiedAt: data.verification?.verifiedAt?.toDate(),
      lastCheckedAt: data.verification?.lastCheckedAt?.toDate()
    }
  } as Domain;
}
