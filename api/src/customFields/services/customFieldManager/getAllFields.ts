/**
 * Get All Custom Fields
 * Retrieves all custom fields for a tenant with optional filtering
 * Can include system fields if includeSystem is true
 */

import { getFirestore } from 'firebase-admin/firestore';
import { CustomFieldDefinition, GetCustomFieldsQuery } from '../../types';
import { getSystemFields } from '../fieldRegistry';

export async function getAllFields(
  tenantId: string,
  query?: GetCustomFieldsQuery
): Promise<CustomFieldDefinition[]> {
  console.log(`📋 Fetching custom fields for tenant ${tenantId}`, query);

  const db = getFirestore();

  try {
    // Fetch user-defined custom fields from Firestore
    let firestoreQuery = db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFields')
      .orderBy('order', 'asc');

    // Apply filters
    if (query?.entityScope) {
      firestoreQuery = firestoreQuery.where('entityScope', '==', query.entityScope) as any;
    }

    if (query?.group) {
      firestoreQuery = firestoreQuery.where('group', '==', query.group) as any;
    }

    const snapshot = await firestoreQuery.get();

    const customFields: CustomFieldDefinition[] = [];
    snapshot.forEach((doc) => {
      customFields.push({
        id: doc.id,
        ...doc.data(),
      } as CustomFieldDefinition);
    });

    console.log(`✅ Found ${customFields.length} user-defined custom fields`);

    // Include system fields if requested (default: false - must be explicitly opted-in)
    const includeSystem = query?.includeSystem === true;

    if (includeSystem) {
      // Get system fields from code-defined registry
      let systemFields = getSystemFields(query?.entityScope);

      // Exclude internal fields by default (id, tenant_id, created_at, updated_at)
      const excludeInternal = query?.excludeInternal !== false; // Default true
      if (excludeInternal) {
        systemFields = systemFields.filter(field => !field.isInternal);
        console.log(`   🔒 Filtered out ${getSystemFields(query?.entityScope).length - systemFields.length} internal system fields`);
      }

      // Convert system fields to CustomFieldDefinition format
      const systemFieldDefinitions: CustomFieldDefinition[] = systemFields.map((field) => ({
        id: `system_${field.name}`,
        tenantId: tenantId,
        name: field.name,
        displayName: field.displayName,
        description: field.description,
        type: field.type,
        entityScope: field.entityScope,
        group: field.group || '',
        placeholder: '',
        validation: field.validation || {},
        isSystemField: true,
        isDefault: field.isAlwaysPresent || false,
        hideFromUI: field.hideFromUI || false,
        order: field.order,
        createdAt: null as any,
        updatedAt: null as any,
        createdBy: 'system'
      }));

      console.log(`✅ Including ${systemFieldDefinitions.length} system fields`);

      // Merge system fields with custom fields, system fields first
      const allFields = [...systemFieldDefinitions, ...customFields];

      // Sort by order
      allFields.sort((a, b) => a.order - b.order);

      console.log(`📊 Final result: ${allFields.length} total fields (${systemFieldDefinitions.length} system + ${customFields.length} custom)`);
      console.log(`   System fields: ${systemFieldDefinitions.map(f => f.name).join(', ')}`);
      console.log(`   Custom fields: ${customFields.map(f => f.name).join(', ')}`);

      return allFields;
    }

    return customFields;
  } catch (error) {
    console.error('❌ Error fetching custom fields:', error);
    throw new Error(`Failed to fetch custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
