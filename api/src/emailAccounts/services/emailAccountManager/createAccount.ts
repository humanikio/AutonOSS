import { db } from '../../../config/firestore';
import { CreateAccountData } from './types';

export async function createAccount(accountData: CreateAccountData): Promise<void> {
  const docRef = db
    .collection('tenants')
    .doc(accountData.tenantId)
    .collection('emailAccounts')
    .doc(accountData.id);

  const existingDoc = await docRef.get();

  const data = {
    ...accountData,
    updatedAt: new Date(),
    syncEnabled: accountData.syncEnabled ?? (existingDoc.exists ? existingDoc.data()?.syncEnabled ?? true : true),
    foldersSynced: accountData.foldersSynced ?? (existingDoc.exists ? existingDoc.data()?.foldersSynced ?? 0 : 0),
    messagesCount: accountData.messagesCount ?? (existingDoc.exists ? existingDoc.data()?.messagesCount ?? 0 : 0),
  };

  await docRef.set(data, { merge: true });
}
