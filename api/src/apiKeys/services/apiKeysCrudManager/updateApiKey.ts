/**
 * Update API Key
 * Updates API key metadata (name, active status, scopes)
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { ApiKey, UpdateApiKeyRequest } from '../../types';

export async function updateApiKey(
  tenantId: string,
  apiKeyId: string,
  updates: UpdateApiKeyRequest
): Promise<ApiKey> {
  const db = getFirestore();

  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.now()
  };

  const batch = db.batch();

  // Update tenant subcollection
  const tenantKeyRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(apiKeyId);

  batch.update(tenantKeyRef, updateData);

  // If active status changed, update root mapping too
  if (updates.active !== undefined) {
    const rootRef = db.collection('autonApiKeys').doc(apiKeyId);
    batch.update(rootRef, {
      active: updates.active
    });
  }

  await batch.commit();

  // Fetch updated document
  const updatedDoc = await tenantKeyRef.get();

  console.log(`✏️  Updated API key ${apiKeyId} for tenant ${tenantId}`);

  return updatedDoc.data() as ApiKey;
}
