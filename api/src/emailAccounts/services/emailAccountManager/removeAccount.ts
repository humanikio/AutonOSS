import { db } from '../../../config/firestore';

export async function removeAccount(tenantId: string, accountId: string): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts')
    .doc(accountId);

  await docRef.delete();
}
