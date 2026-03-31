/**
 * Get Single Custom Field
 * Retrieves a single custom field by ID
 */

import { getFirestore } from 'firebase-admin/firestore';
import { CustomFieldDefinition } from '../../types';

export async function getField(
  tenantId: string,
  fieldId: string
): Promise<CustomFieldDefinition | null> {
  console.log(`🔍 Fetching custom field ${fieldId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const docRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFields')
      .doc(fieldId);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`⚠️  Custom field ${fieldId} not found`);
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as CustomFieldDefinition;
  } catch (error) {
    console.error('❌ Error fetching custom field:', error);
    throw new Error(`Failed to fetch custom field: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
