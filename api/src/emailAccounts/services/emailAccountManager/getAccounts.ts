import { db } from '../../../config/firestore';
import { EmailAccount } from './types';

export async function getAccounts(tenantId: string, filters?: { status?: string; syncEnabled?: boolean }): Promise<EmailAccount[]> {
  let query = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts') as FirebaseFirestore.Query;

  // Apply filters if provided
  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.syncEnabled !== undefined) {
    query = query.where('syncEnabled', '==', filters.syncEnabled);
  }

  const snapshot = await query.get();

  return snapshot.docs
    .filter(doc => doc.id !== 'main') // Exclude config document
    .map(doc => {
      const data = doc.data();
      return {
        ...data,
        connectedAt: data?.connectedAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate(),
        lastSync: data?.lastSync?.toDate(),
        tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
      } as EmailAccount;
    });
}
