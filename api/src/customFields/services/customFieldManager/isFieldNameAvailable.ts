/**
 * Check Field Name Availability
 * Checks if a field name is available for a given entity scope
 * Returns false if name is reserved as system field or already used
 */

import { EntityScope } from '../../types';
import { getAllFields } from './getAllFields';
import { isSystemFieldName } from '../fieldRegistry';

export async function isFieldNameAvailable(
  tenantId: string,
  name: string,
  entityScope: EntityScope
): Promise<boolean> {
  // Check if reserved as system field
  if (isSystemFieldName(name, entityScope)) {
    return false;
  }

  // Check if already exists in custom fields
  const fields = await getAllFields(tenantId, { entityScope });
  return !fields.some((f) => f.name === name);
}
