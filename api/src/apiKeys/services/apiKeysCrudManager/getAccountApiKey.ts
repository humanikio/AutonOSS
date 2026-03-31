/**
 * Get Account API Key
 * Retrieves the active account service key for a tenant
 * Used for workflow automation and system operations
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getDecryptedApiKey } from './getDecryptedApiKey';

export async function getAccountApiKey(
  tenantId: string
): Promise<string | null> {
  const db = getFirestore();

  // Read main settings document to get active account key ID
  const mainDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc('main')
    .get();

  if (!mainDoc.exists) {
    console.log(`❌ No account API key configured for tenant ${tenantId}`);
    return null;
  }

  const settings = mainDoc.data();

  if (!settings || !settings.activeAccountApiKeyId) {
    console.log(`❌ No active account API key ID in settings for tenant ${tenantId}`);
    return null;
  }

  const { activeAccountApiKeyId } = settings;

  // Get and decrypt the account key
  const fullKey = await getDecryptedApiKey(tenantId, activeAccountApiKeyId);

  if (!fullKey) {
    console.log(`❌ Could not retrieve account API key ${activeAccountApiKeyId} for tenant ${tenantId}`);
    return null;
  }

  console.log(`✅ Retrieved account API key for tenant ${tenantId}`);
  return fullKey;
}
