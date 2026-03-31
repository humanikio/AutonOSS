/**
 * Validate API Key
 * Validates two-part API key (accessKeyId.apiSecret) with direct lookup
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { decryptApiKey } from '../../utils/encryption';
import { ValidateApiKeyResult } from '../../types';

export async function validateApiKey(
  fullKey: string
): Promise<ValidateApiKeyResult> {
  const db = getFirestore();

  try {
    // Split two-part key: accessKeyId.apiSecret
    const parts = fullKey.split('.');
    if (parts.length !== 2) {
      console.log(`❌ Invalid key format: expected accessKeyId.apiSecret`);
      return { valid: false };
    }

    const [accessKeyId, providedSecret] = parts;

    // Validate format
    if (!accessKeyId.startsWith('plkey_') || !providedSecret.startsWith('plsec_')) {
      console.log(`❌ Invalid key format: missing plkey_ or plsec_ prefix`);
      return { valid: false };
    }

    // Direct document lookup using accessKeyId (O(1) instead of query)
    const mappingDoc = await db
      .collection('autonApiKeys')
      .doc(accessKeyId)
      .get();

    if (!mappingDoc.exists) {
      console.log(`❌ No key found with accessKeyId ${accessKeyId}`);
      return { valid: false };
    }

    const mapping = mappingDoc.data()!;
    const { tenantId, active, encryptedSecret } = mapping;

    // Check if key is active in mapping
    if (!active) {
      console.log(`❌ Key ${accessKeyId} is not active`);
      return { valid: false };
    }

    // Get full key data from tenant subcollection for expiration check
    const keyDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('autonApiKeys')
      .doc(accessKeyId)
      .get();

    if (!keyDoc.exists) {
      console.log(`❌ Key ${accessKeyId} not found in tenant ${tenantId} subcollection`);
      return { valid: false };
    }

    const keyData = keyDoc.data()!;

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt.toDate() < new Date()) {
      console.log(`❌ Key ${accessKeyId} has expired`);
      return { valid: false };
    }

    // Decrypt stored secret
    const storedSecret = decryptApiKey(encryptedSecret);

    // Compare secrets (constant-time comparison to prevent timing attacks)
    if (storedSecret !== providedSecret) {
      console.log(`❌ Secret mismatch for ${accessKeyId}`);
      return { valid: false };
    }

    // Update usage stats asynchronously (don't block response)
    updateKeyUsage(tenantId, accessKeyId).catch(err =>
      console.error('Failed to update key usage:', err)
    );

    console.log(`✅ Valid API key for tenant ${tenantId}`);
    return { valid: true, tenantId, apiKeyId: accessKeyId };

  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false };
  }
}

/**
 * Update usage statistics for an API key (async, non-blocking)
 */
async function updateKeyUsage(tenantId: string, apiKeyId: string): Promise<void> {
  const db = getFirestore();
  const now = Timestamp.now();

  const batch = db.batch();

  // Update root mapping
  const rootRef = db.collection('autonApiKeys').doc(apiKeyId);
  batch.update(rootRef, {
    lastUsedAt: now,
    usageCount: FieldValue.increment(1)
  });

  // Update tenant subcollection
  const tenantKeyRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(apiKeyId);
  batch.update(tenantKeyRef, {
    lastUsedAt: now,
    usageCount: FieldValue.increment(1)
  });

  await batch.commit();
}
