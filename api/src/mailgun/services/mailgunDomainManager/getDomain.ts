import { db } from '../../../config/firestore';
import { MailgunDomain } from './types';

/**
 * Get a specific Mailgun domain for a tenant
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @returns Domain data or null if not found
 */
export async function getDomain(tenantId: string, domainId: string): Promise<MailgunDomain | null> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('mailgun')
    .doc('config')
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
    verifiedAt: data.verifiedAt?.toDate(),
    lastSyncedAt: data.lastSyncedAt?.toDate(),
    verification: data.verification ? {
      ...data.verification,
      lastVerified: data.verification.lastVerified?.toDate()
    } : undefined
  } as MailgunDomain;
}
