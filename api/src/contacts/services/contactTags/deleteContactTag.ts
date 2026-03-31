/**
 * Delete Contact Tag
 * Deletes a contact tag definition
 */

import { getFirestore } from 'firebase-admin/firestore';

export async function deleteContactTag(tenantId: string, tagId: string): Promise<void> {
  console.log(`=Ñ  Deleting contact tag ${tagId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const tagRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('contactTags')
      .doc(tagId);

    const tagDoc = await tagRef.get();

    if (!tagDoc.exists) {
      throw new Error('Contact tag not found');
    }

    await tagRef.delete();

    console.log(` Contact tag ${tagId} deleted successfully`);
  } catch (error) {
    console.error('L Error deleting contact tag:', error);
    throw new Error(`Failed to delete contact tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
