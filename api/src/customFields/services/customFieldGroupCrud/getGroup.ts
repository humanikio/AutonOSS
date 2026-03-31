/**
 * Get Field Group
 * Retrieves a single field group by ID
 */

import { getFirestore } from 'firebase-admin/firestore';
import { FieldGroup } from '../../types';

export async function getGroup(tenantId: string, groupId: string): Promise<FieldGroup | null> {
  console.log(`= Fetching field group ${groupId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFieldGroups')
      .doc(groupId);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`   Field group ${groupId} not found`);
      return null;
    }

    const group = {
      id: doc.id,
      ...doc.data(),
    } as FieldGroup;

    console.log(` Found field group: ${group.name}`);
    return group;
  } catch (error) {
    console.error('L Error fetching field group:', error);
    throw new Error(`Failed to fetch field group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
