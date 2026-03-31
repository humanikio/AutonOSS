import { db } from '../../../config/firestore';
import { MailgunDomain } from './types';

/**
 * Get all Mailgun domains for a tenant
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters for state or status
 * @returns Array of domains
 */
export async function getDomains(
  tenantId: string,
  filters?: {
    state?: 'unverified' | 'active' | 'disabled';
    status?: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled';
  }
): Promise<MailgunDomain[]> {
  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('mailgun')
    .doc('config')
    .collection('domains') as any;

  // Apply filters if provided
  if (filters?.state) {
    query = query.where('state', '==', filters.state);
  }

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
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
  });
}
