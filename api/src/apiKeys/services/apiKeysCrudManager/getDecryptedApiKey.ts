/**
 * Get Decrypted API Key
 * Retrieves and decrypts an API key for use in workflows
 * Returns full key in accessKeyId.apiSecret format
 */

import { getFirestore } from 'firebase-admin/firestore';
import { decryptApiKey } from '../../utils/encryption';

export async function getDecryptedApiKey(
  tenantId: string,
  accessKeyId: string
): Promise<string | null> {
  const db = getFirestore();

  const doc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('autonApiKeys')
    .doc(accessKeyId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  if (!data || !data.encryptedSecret) {
    return null;
  }

  // Decrypt the secret
  const apiSecret = decryptApiKey(data.encryptedSecret);

  // Return full key in accessKeyId.apiSecret format
  return `${accessKeyId}.${apiSecret}`;
}
