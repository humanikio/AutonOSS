import { db } from '../../../config/firestore';
import { EmailConfig } from './types';

export async function updateConfig(tenantId: string, config: Partial<EmailConfig>): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts')
    .doc('main');

  await docRef.set({
    ...config,
    updatedAt: new Date()
  }, { merge: true });
}
