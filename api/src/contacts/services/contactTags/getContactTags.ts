/**
 * Get All Contact Tags
 * Retrieves all contact tags for a tenant
 */

import { getFirestore } from 'firebase-admin/firestore';

export interface ContactTag {
  tagId: string;
  tagName: string;
  timestamp: FirebaseFirestore.Timestamp;
}

export async function getContactTags(tenantId: string): Promise<ContactTag[]> {
  console.log(`Fetching contact tags for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contactTags')
      .get();

    const tags: ContactTag[] = [];
    snapshot.forEach((doc) => {
      tags.push({
        tagId: doc.id,
        ...doc.data(),
      } as ContactTag);
    });

    // Sort by timestamp descending in-memory
    tags.sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
      return timeB - timeA;
    });

    console.log(`Found ${tags.length} contact tags`);
    return tags;
  } catch (error) {
    console.error('Error fetching contact tags:', error);
    throw new Error(`Failed to fetch contact tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
