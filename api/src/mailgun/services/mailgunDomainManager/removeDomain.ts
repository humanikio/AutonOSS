import { db } from '../../../config/firestore';
import { disconnectDomainFromMailgun } from '../../../domains/utils/syncDomainConnections';
import axios from 'axios';

/**
 * Remove a Mailgun domain
 *
 * Flow:
 * 1. Delete from Mailgun API
 * 2. Delete from Firestore
 *
 * @param tenantId - Tenant ID
 * @param domainId - Domain name (e.g., "mybusiness.com")
 * @param originalDomainId - Original domain before root extraction (for legacy support)
 */
export async function removeDomain(tenantId: string, domainId: string, originalDomainId?: string): Promise<void> {
  // Try to find the domain - check root domain first, then original domain (for legacy)
  const collectionRef = db
    .collection('tenants')
    .doc(tenantId)
    .collection('mailgun')
    .doc('config')
    .collection('domains');

  let docRef = collectionRef.doc(domainId);
  let doc = await docRef.get();

  // Track which domain key we're actually using
  let actualDomainKey = domainId;
  const rootDomainForBase = domainId; // Base domain always uses root

  // If not found with root domain and we have an original, try with original (legacy support)
  if (!doc.exists && originalDomainId && originalDomainId !== domainId) {
    console.log(`[MAILGUN] Domain not found with root: ${domainId}, trying original: ${originalDomainId}`);
    docRef = collectionRef.doc(originalDomainId);
    doc = await docRef.get();

    if (doc.exists) {
      console.log(`[MAILGUN] Found domain using original key: ${originalDomainId}`);
      actualDomainKey = originalDomainId; // Use original for Mailgun API call and Firestore delete
    }
  }

  // Verify domain exists
  if (!doc.exists) {
    throw new Error(`Domain ${domainId} not found`);
  }

  try {
    // Delete from Mailgun API - use Account API Key for domain management
    const apiKey = process.env.MAILGUN_API_KEY || process.env.MAILGUN_SENDING_KEY;
    if (!apiKey) {
      throw new Error('MAILGUN_API_KEY not configured. Domain management requires Account API Key.');
    }

    console.log(`[MAILGUN] Deleting domain ${actualDomainKey} from Mailgun API`);
    await axios.delete(
      `https://api.mailgun.net/v3/domains/${actualDomainKey}`,
      {
        auth: {
          username: 'api',
          password: apiKey
        }
      }
    );

    // Delete from Firestore
    await docRef.delete();

    // Update base domain to remove Mailgun connection (always uses root domain)
    try {
      await disconnectDomainFromMailgun(tenantId, rootDomainForBase);
    } catch (error) {
      console.warn(`[MAILGUN] Could not disconnect base domain ${rootDomainForBase}:`, error);
      // Don't fail the entire operation if base domain sync fails
    }

    console.log(`[MAILGUN] Domain ${actualDomainKey} removed successfully and disconnected`);

  } catch (error) {
    console.error('[MAILGUN] Error removing domain:', error);

    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown Mailgun error';

      if (status === 401) {
        throw new Error('Mailgun authentication failed. Check your API key.');
      } else if (status === 404) {
        // Domain not found in Mailgun, but we should still remove from Firestore
        console.warn(`[MAILGUN] Domain ${actualDomainKey} not found in Mailgun, removing from Firestore anyway`);
        await docRef.delete();
        try {
          await disconnectDomainFromMailgun(tenantId, rootDomainForBase);
        } catch (disconnectError) {
          console.warn(`[MAILGUN] Could not disconnect base domain:`, disconnectError);
        }
        return;
      } else if (status === 400) {
        throw new Error(`Mailgun request error: ${message}`);
      }
    }

    throw new Error(`Failed to remove domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
