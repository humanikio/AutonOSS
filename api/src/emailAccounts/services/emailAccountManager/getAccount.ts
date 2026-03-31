import { db } from '../../../config/firestore';
import { EmailAccount } from './types';

export async function getAccount(tenantId: string, accountId: string): Promise<EmailAccount | null> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts')
    .doc(accountId);

  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    ...data,
    connectedAt: data?.connectedAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate(),
    lastSync: data?.lastSync?.toDate(),
    tokenExpiresAt: data?.tokenExpiresAt?.toDate() || null,
  } as EmailAccount;
}
