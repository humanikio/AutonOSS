/**
 * Get API Key
 * Retrieves a specific API key by ID
 */

import { getFirestore } from 'firebase-admin/firestore';
import { ApiKey } from '../../types';

export async function getApiKey(
  tenantId: string,
  apiKeyId: string
): Promise<ApiKey | null> {
  const db = getFirestore();

  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(apiKeyId)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as ApiKey;
}
