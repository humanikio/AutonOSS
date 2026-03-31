/**
 * Validate Contact Tags
 * Validates that tag IDs exist before applying them to contacts
 */

import { getTagById } from './getTagId';

export interface TagValidationResult {
  valid: boolean;
  validTagIds: string[];
  invalidTagIds: string[];
  error?: string;
}

/**
 * Validates an array of tag IDs against the database
 * @param tenantId - Tenant ID
 * @param tagIds - Array of tag IDs to validate
 * @returns Validation result with valid and invalid tag IDs
 */
export async function validateTags(
  tenantId: string,
  tagIds: string[]
): Promise<TagValidationResult> {
  console.log(`<÷  Validating ${tagIds.length} tag(s) for tenant ${tenantId}`);

  if (!tagIds || tagIds.length === 0) {
    return {
      valid: true,
      validTagIds: [],
      invalidTagIds: [],
    };
  }

  try {
    const validTagIds: string[] = [];
    const invalidTagIds: string[] = [];

    // Validate each tag ID
    for (const tagId of tagIds) {
      const tag = await getTagById(tenantId, tagId);
      if (tag) {
        validTagIds.push(tagId);
      } else {
        invalidTagIds.push(tagId);
      }
    }

    const valid = invalidTagIds.length === 0;

    if (valid) {
      console.log(` All ${validTagIds.length} tag(s) are valid`);
    } else {
      console.log(`   ${invalidTagIds.length} invalid tag(s) found: ${invalidTagIds.join(', ')}`);
    }

    return {
      valid,
      validTagIds,
      invalidTagIds,
      error: invalidTagIds.length > 0
        ? `Invalid tag IDs: ${invalidTagIds.join(', ')}`
        : undefined,
    };
  } catch (error) {
    console.error('L Error validating tags:', error);
    return {
      valid: false,
      validTagIds: [],
      invalidTagIds: tagIds,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validates and filters tag IDs, returning only valid ones
 * @param tenantId - Tenant ID
 * @param tagIds - Array of tag IDs to validate
 * @returns Array of valid tag IDs
 */
export async function getValidTagIds(
  tenantId: string,
  tagIds: string[]
): Promise<string[]> {
  const result = await validateTags(tenantId, tagIds);
  return result.validTagIds;
}
