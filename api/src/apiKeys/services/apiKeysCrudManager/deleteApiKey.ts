/**
 * Delete API Key
 * Removes API key from both root and tenant collections
 */

import { getFirestore } from 'firebase-admin/firestore';

export async function deleteApiKey(
  tenantId: string,
  apiKeyId: string
): Promise<void> {
  const db = getFirestore();

  const batch = db.batch();

  // Delete from root mapping collection
  const rootRef = db.collection('autonApiKeys').doc(apiKeyId);
  batch.delete(rootRef);

  // Delete from tenant subcollection
  const tenantKeyRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(apiKeyId);
  batch.delete(tenantKeyRef);

  await batch.commit();

  console.log(`🗑️  Deleted API key ${apiKeyId} for tenant ${tenantId}`);
}
