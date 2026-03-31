/**
 * Create API Key
 * Generates a new two-part API key and stores it in both root and tenant collections
 * Supports account service keys for workflow automation
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateApiKey } from '../../utils/keyGenerator';
import { encryptApiKey } from '../../utils/encryption';
import { ApiKey, ApiKeyMapping, CreateApiKeyRequest } from '../../types';

export async function createApiKey(
  tenantId: string,
  userId: string,
  data: CreateApiKeyRequest
): Promise<{ apiKey: ApiKey; accessKeyId: string; apiSecret: string; fullKey: string }> {
  const db = getFirestore();

  // Generate new two-part API key (accessKeyId + apiSecret)
  const { accessKeyId, apiSecret, fullKey, secretLastFour } = generateApiKey(data.environment || 'live');

  // Encrypt the API secret for storage
  const encryptedSecret = encryptApiKey(apiSecret);

  const now = Timestamp.now();

  // Build full API key document (for tenant subcollection)
  const apiKey: ApiKey = {
    id: accessKeyId,
    name: data.name,
    secretLastFour,
    encryptedSecret,
    environment: data.environment || 'live',
    active: true,
    isAccountKey: data.isAccountKey || false,
    scopes: data.scopes || [],
    createdAt: now,
    createdBy: userId,
    lastUsedAt: null,
    usageCount: 0,
    expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
    metadata: {}
  };

  // Build root mapping document (for fast direct lookups)
  const mapping: ApiKeyMapping = {
    id: accessKeyId,
    encryptedSecret,
    tenantId,
    active: true,
    createdAt: now,
    lastUsedAt: null,
    usageCount: 0
  };

  // Write to both locations atomically using batch
  const batch = db.batch();

  // Write to root mapping collection (use accessKeyId as document ID)
  const rootRef = db.collection('autonApiKeys').doc(accessKeyId);
  batch.set(rootRef, mapping);

  // Write to tenant subcollection (use accessKeyId as document ID)
  const tenantKeyRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(accessKeyId);
  batch.set(tenantKeyRef, apiKey);

  // If this is an account service key, update the main settings document
  if (data.isAccountKey) {
    const mainSettingsRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('autonApiKeys')
      .doc('main');

    batch.set(
      mainSettingsRef,
      {
        activeAccountApiKeyId: accessKeyId,
        updatedAt: now
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log(`🔑 Created API key ${accessKeyId} (${data.isAccountKey ? 'Account Key' : 'Standard'}) for tenant ${tenantId}`);

  return { apiKey, accessKeyId, apiSecret, fullKey };
}
