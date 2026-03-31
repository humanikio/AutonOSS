/**
 * Get All Field Groups
 * Retrieves all field groups for a tenant with optional filtering
 */

import { getFirestore } from 'firebase-admin/firestore';
import { FieldGroup, GetFieldGroupsQuery } from '../../types';

export async function getAllGroups(
  tenantId: string,
  query?: GetFieldGroupsQuery
): Promise<FieldGroup[]> {
  console.log(`=Ë Fetching field groups for tenant ${tenantId}`, query);

  const db = getFirestore();

  try {
    let firestoreQuery = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFieldGroups')
      .orderBy('order', 'asc');

    // Apply filters
    if (query?.entityScope) {
      firestoreQuery = firestoreQuery.where('entityScope', '==', query.entityScope) as any;
    }

    const snapshot = await firestoreQuery.get();

    const groups: FieldGroup[] = [];
    snapshot.forEach((doc) => {
      groups.push({
        id: doc.id,
        ...doc.data(),
      } as FieldGroup);
    });

    console.log(` Found ${groups.length} field groups`);
    return groups;
  } catch (error) {
    console.error('L Error fetching field groups:', error);
    throw new Error(`Failed to fetch field groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
