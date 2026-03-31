/**
 * Update Custom Field
 * Updates an existing custom field definition
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CustomFieldDefinition, UpdateCustomFieldRequest } from '../../types';
import { getAllGroups } from '../customFieldGroupCrud';

export async function updateField(
  tenantId: string,
  fieldId: string,
  data: UpdateCustomFieldRequest
): Promise<CustomFieldDefinition> {
  console.log(`✏️  Updating custom field ${fieldId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFields')
      .doc(fieldId);

    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error('Custom field not found');
    }

    const existingField = doc.data() as CustomFieldDefinition;

    // Prevent modifying system fields
    if (existingField.isSystemField) {
      throw new Error('Cannot modify system field');
    }

    // Validate group exists if provided
    if (data.group) {
      const groups = await getAllGroups(tenantId, {
        entityScope: existingField.entityScope,
      });

      const groupExists = groups.some((g: { name: string }) => g.name === data.group);
      if (!groupExists) {
        throw new Error(`Group "${data.group}" does not exist for ${existingField.entityScope}`);
      }
    }

    const updates = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    await docRef.update(updates);

    console.log(`✅ Custom field ${fieldId} updated`);

    // Return updated field
    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as CustomFieldDefinition;
  } catch (error) {
    console.error('❌ Error updating custom field:', error);
    throw new Error(`Failed to update custom field: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
