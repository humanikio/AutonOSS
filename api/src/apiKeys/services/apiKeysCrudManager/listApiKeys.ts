/**
 * List API Keys
 * Returns all API keys for a tenant (excludes encrypted secrets)
 */

import { getFirestore } from 'firebase-admin/firestore';
import { ListApiKeysResponse } from '../../types';

export async function listApiKeys(
  tenantId: string
): Promise<ListApiKeysResponse[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs
    .filter(doc => doc.id !== 'main') // Exclude settings document
    .map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        name: data.name,
        secretLastFour: data.secretLastFour,
        environment: data.environment,
        active: data.active,
        isAccountKey: data.isAccountKey,
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
        usageCount: data.usageCount
        // Note: encryptedSecret is intentionally excluded for security
      };
    });
}
