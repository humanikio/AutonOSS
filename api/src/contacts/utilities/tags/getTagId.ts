/**
 * Get Tag by ID
 * Retrieves a single contact tag by ID
 */

import { getFirestore } from 'firebase-admin/firestore';
import { ContactTag } from '../../services/contactTags/getContactTags';

export async function getTagById(tenantId: string, tagId: string): Promise<ContactTag | null> {
  console.log(`🔍 Fetching contact tag ${tagId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const tagDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('contactTags')
      .doc(tagId)
      .get();

    if (!tagDoc.exists) {
      console.log(`❌ Contact tag ${tagId} not found`);
      return null;
    }

    const tag = {
      tagId: tagDoc.id,
      ...tagDoc.data(),
    } as ContactTag;

    console.log(`✅ Found contact tag: ${tag.tagName}`);
    return tag;
  } catch (error) {
    console.error('❌ Error fetching contact tag:', error);
    throw new Error(`Failed to fetch contact tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
