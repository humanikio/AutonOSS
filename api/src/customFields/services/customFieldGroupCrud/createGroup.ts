/**
 * Create Field Group
 * Creates a new field group definition
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { FieldGroup, CreateFieldGroupRequest } from '../../types';
import { getAllGroups } from './getAllGroups';

export async function createGroup(
  tenantId: string,
  data: CreateFieldGroupRequest
): Promise<FieldGroup> {
  console.log(`• Creating field group "${data.name}" for tenant ${tenantId}`);

  const db = getFirestore();

  try {
    // Validate group name (no spaces, lowercase, alphanumeric + underscore)
    if (!/^[a-z0-9_]+$/.test(data.name)) {
      throw new Error('Group name must be lowercase alphanumeric with underscores only');
    }

    // Check if group name already exists for this entity scope
    const existingGroups = await getAllGroups(tenantId, {
      entityScope: data.entityScope,
    });

    const nameExists = existingGroups.some((g) => g.name === data.name);
    if (nameExists) {
      throw new Error(`Group name "${data.name}" already exists for ${data.entityScope}`);
    }

    const now = Timestamp.now();
    const groupId = uuidv4();

    const fieldGroup: FieldGroup = {
      id: groupId,
      tenantId,
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      entityScope: data.entityScope,
      icon: data.icon,
      color: data.color,
      order: data.order ?? 999, // Default to end
      isSystemGroup: false, // Custom groups are never system groups
      createdAt: now,
      updatedAt: now,
    };

    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('customFieldGroups')
      .doc(groupId)
      .set(fieldGroup);

    console.log(` Field group "${data.name}" created with ID ${groupId}`);
    return fieldGroup;
  } catch (error) {
    console.error('L Error creating field group:', error);
    throw new Error(`Failed to create field group: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
