/**
 * Fetch All Custom Fields
 * Tool to fetch custom field definitions from the Custom Fields API
 */

import { customFieldManager } from '../../customFields';
import { EntityScope, CustomFieldDefinition } from '../../customFields/types';

/**
 * Fetches all custom fields for a given entity scope
 * @param tenantId - Tenant ID
 * @param entityScope - Entity type (contact, opportunity, company, deal)
 * @returns Array of custom field definitions
 */
export async function fetchAllCustomFields(
  tenantId: string,
  entityScope: EntityScope
): Promise<CustomFieldDefinition[]> {
  try {
    const customFields = await customFieldManager.getAllFields(tenantId, { entityScope });
    return customFields;
  } catch (error) {
    console.error(`L Error fetching custom fields for ${entityScope}:`, error);
    throw new Error(
      `Failed to fetch custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
