/**
 * Create Custom Field
 * Creates a new custom field definition
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CustomFieldDefinition, CreateCustomFieldRequest } from '../../types';
import { getAllFields } from './getAllFields';
import { isSystemFieldName } from '../fieldRegistry';
import { getAllGroups } from '../customFieldGroupCrud';

export async function createField(
  tenantId: string,
  userId: string,
  data: CreateCustomFieldRequest,
  overrides?: {
    isSystemField?: boolean;
    isDefault?: boolean;
  }
): Promise<CustomFieldDefinition> {
  console.log(`➕ Creating custom field "${data.name}" for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    // Validate field name (no spaces, lowercase, alphanumeric + underscore)
    if (!/^[a-z0-9_]+$/.test(data.name)) {
      throw new Error('Field name must be lowercase alphanumeric with underscores only');
    }

    // Check if field name is reserved as a system field
    if (isSystemFieldName(data.name, data.entityScope)) {
      throw new Error(`Field name "${data.name}" is reserved as a system field for ${data.entityScope}`);
    }

    // Check if field name already exists in custom fields for this entity scope
    const existingFields = await getAllFields(tenantId, {
      entityScope: data.entityScope,
    });

    const nameExists = existingFields.some((f) => f.name === data.name);
    if (nameExists) {
      throw new Error(`Field name "${data.name}" already exists for ${data.entityScope}`);
    }

    // Validate group exists if provided
    if (data.group) {
      const groups = await getAllGroups(tenantId, {
        entityScope: data.entityScope,
      });

      const groupExists = groups.some((g: { name: string }) => g.name === data.group);
      if (!groupExists) {
        throw new Error(`Group "${data.group}" does not exist for ${data.entityScope}`);
      }
    }

    const now = Timestamp.now();
    const fieldId = uuidv4();

    const customField: CustomFieldDefinition = {
      id: fieldId,
      tenantId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      type: data.type,
      entityScope: data.entityScope,
      group: data.group,
      placeholder: data.placeholder,
      validation: data.validation || {},
      isSystemField: overrides?.isSystemField ?? false,
      isDefault: overrides?.isDefault ?? false,
      order: data.order ?? 999, // Default to end
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFields')
      .doc(fieldId)
      .set(customField);

    console.log(`✅ Custom field "${data.name}" created with ID ${fieldId}`);
    return customField;
  } catch (error) {
    console.error('❌ Error creating custom field:', error);
    throw new Error(`Failed to create custom field: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
