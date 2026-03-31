/**
 * Fetch Contact Field Groups
 * Tool to fetch field group definitions for contact entity
 */

import { fieldGroupManager } from '../../customFields/services/customFieldGroupCrud';
import { EntityScope, FieldGroup } from '../../customFields/types';

/**
 * Fetches all field groups for contacts
 * @param tenantId - Tenant ID
 * @returns Array of field group definitions
 */
export async function fetchContactFieldGroups(
  tenantId: string
): Promise<FieldGroup[]> {
  try {
    const groups = await fieldGroupManager.getAllGroups(tenantId, {
      entityScope: 'contact' as EntityScope,
    });
    return groups;
  } catch (error) {
    console.error('L Error fetching contact field groups:', error);
    throw new Error(
      `Failed to fetch field groups: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
