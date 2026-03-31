import { db } from '../../../config/firestore';
import { EmailConfig } from './types';

export async function getConfig(tenantId: string): Promise<EmailConfig | null> {
  const docRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('emailAccounts')
    .doc('main');

  const doc = await docRef.get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  return {
    ...data,
    createdAt: data?.createdAt?.toDate(),
    updatedAt: data?.updatedAt?.toDate(),
  } as EmailConfig;
}
