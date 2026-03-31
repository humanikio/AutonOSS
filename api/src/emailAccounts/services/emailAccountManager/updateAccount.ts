import { db } from '../../../config/firestore';
import { EmailAccount } from './types';

export async function updateAccount(
  tenantId: string,
  accountId: string,
  updateData: Partial<EmailAccount>
): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts')
    .doc(accountId);

  await docRef.update({
    ...updateData,
    updatedAt: new Date()
  });
}
