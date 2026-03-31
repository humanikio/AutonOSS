/**
 * Delete Field Group
 * Deletes a field group definition
 * BEFORE deletion, removes group reference from all fields using this group
 */

import { getFirestore } from 'firebase-admin/firestore';
import { FieldGroup, CustomFieldDefinition } from '../../types';

export async function deleteGroup(tenantId: string, groupId: string): Promise<void> {
  console.log(`🗑️  Deleting field group ${groupId} for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    const groupRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFieldGroups')
      .doc(groupId);

    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      throw new Error('Field group not found');
    }

    const group = groupDoc.data() as FieldGroup;

    // Prevent deleting system groups
    if (group.isSystemGroup) {
      throw new Error('Cannot delete system group');
    }

    // STEP 1: Find all fields using this group (by group name)
    console.log(`🔍 Searching for fields using group "${group.name}"...`);
    const fieldsQuery = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFields')
      .where('group', '==', group.name)
      .get();

    const affectedFieldsCount = fieldsQuery.size;
    console.log(`📋 Found ${affectedFieldsCount} field(s) using this group`);

    // STEP 2: Remove group reference from all affected fields using batch
    if (affectedFieldsCount > 0) {
      console.log(`🧹 Removing group reference from ${affectedFieldsCount} field(s)...`);

      // Firestore batch has a limit of 500 operations
      const batchSize = 500;
      const batches: FirebaseFirestore.WriteBatch[] = [];
      let currentBatch = db.batch();
      let operationCount = 0;

      fieldsQuery.docs.forEach((fieldDoc) => {
        const fieldData = fieldDoc.data() as CustomFieldDefinition;
        console.log(`   - Updating field: ${fieldData.name} (${fieldData.displayName})`);

        // Remove group reference (set to empty string to maintain field structure)
        currentBatch.update(fieldDoc.ref, {
          group: '',
          updatedAt: new Date()
        });

        operationCount++;

        // Create new batch if we hit the limit
        if (operationCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      });

      // Add the last batch if it has operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Add group deletion to the last batch
      batches[batches.length - 1].delete(groupRef);

      // Commit all batches sequentially
      console.log(`💾 Committing ${batches.length} batch(es)...`);
      for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(`   ✓ Batch ${i + 1}/${batches.length} committed`);
      }
    } else {
      // No fields using this group, just delete it
      console.log(`✓ No fields using this group, deleting directly...`);
      await groupRef.delete();
    }

    console.log(`✅ Field group "${group.displayName}" deleted successfully`);
    if (affectedFieldsCount > 0) {
      console.log(`   ${affectedFieldsCount} field(s) have been ungrouped`);
    }
  } catch (error) {
    console.error('❌ Error deleting field group:', error);
    throw new Error(`Failed to delete field group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
