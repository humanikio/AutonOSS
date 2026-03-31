/**
 * Update Field Group
 * Updates an existing field group definition
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { FieldGroup, UpdateFieldGroupRequest } from '../../types';

export async function updateGroup(
  tenantId: string,
  groupId: string,
  data: UpdateFieldGroupRequest
): Promise<FieldGroup> {
  console.log(`  Updating field group ${groupId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFieldGroups')
      .doc(groupId);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Field group not found');
    }

    const existingGroup = doc.data() as FieldGroup;

    // Prevent modifying system groups
    if (existingGroup.isSystemGroup) {
      throw new Error('Cannot modify system group');
    }

    const updates = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    await docRef.update(updates);

    console.log(` Field group ${groupId} updated`);

    // Return updated group
    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as FieldGroup;
  } catch (error) {
    console.error('L Error updating field group:', error);
    throw new Error(`Failed to update field group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
