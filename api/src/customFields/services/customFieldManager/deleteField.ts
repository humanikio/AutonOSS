/**
 * Delete Custom Field
 * Deletes a custom field definition
 */

import { getFirestore } from 'firebase-admin/firestore';
import { CustomFieldDefinition } from '../../types';

export async function deleteField(tenantId: string, fieldId: string): Promise<void> {
  console.log(`🗑️  Deleting custom field ${fieldId} for tenant ${tenantId}`);

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

    const field = doc.data() as CustomFieldDefinition;

    // Prevent deleting system fields
    if (field.isSystemField) {
      throw new Error('Cannot delete system field');
    }

    await docRef.delete();

    console.log(`✅ Custom field ${fieldId} deleted`);
  } catch (error) {
    console.error('❌ Error deleting custom field:', error);
    throw new Error(`Failed to delete custom field: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
