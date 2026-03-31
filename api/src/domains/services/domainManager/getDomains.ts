import { db } from '../../../config/firestore';
import { Domain } from './types';

/**
 * Get all domains for a tenant
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters
 * @returns Array of domains
 */
export async function getDomains(
  tenantId: string,
  filters?: {
    verified?: boolean;
    isPrimary?: boolean;
    hasConnection?: 'mailgun';  // Future: 'vercel', 'cloudflare', etc.
  }
): Promise<Domain[]> {
  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('domains') as any;

  // Apply filters if provided
  if (filters?.verified !== undefined) {
    query = query.where('verification.status', '==', filters.verified ? 'verified' : 'pending');
  }

  if (filters?.isPrimary !== undefined) {
    query = query.where('isPrimary', '==', filters.isPrimary);
  }

  if (filters?.hasConnection) {
    query = query.where(`connections.${filters.hasConnection}`, '==', true);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
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
  });
}
