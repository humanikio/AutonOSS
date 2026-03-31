/**
 * Resolve Custom Fields Utility
 * Handles verification and merging of custom fields with contact data
 */

import { CustomFieldDefinition, FieldGroup } from '../../customFields/types';
import { SystemFieldDefinition, getSystemFields } from '../../customFields/services/fieldRegistry';

export interface FieldDefinition {
  name: string;
  displayName: string;
  type: string;
  isSystemField: boolean;
}

export interface MergedField {
  name: string;
  displayName: string;
  type: string;
  value: any;
  isSystemField: boolean;
  hideFromUI?: boolean;
  group?: string;
  groupDisplayName?: string;
  groupOrder?: number;
  order: number;
}

/**
 * Verify provided fields against custom and system field definitions
 * Used for CREATE and UPDATE operations to validate incoming data
 *
 * @param payload - Data provided in request (e.g., { name: "John", custom_lead_score: 85 })
 * @param customFields - Custom field definitions from API
 * @param entityScope - Entity type (default: 'contact')
 * @returns Validated fields object (sparse) ready to save to Firestore
 * @throws Error if invalid field name provided
 */
export function verifyCustomFields(
  payload: Record<string, any>,
  customFields: CustomFieldDefinition[],
  entityScope: 'contact' | 'opportunity' | 'company' | 'deal' = 'contact'
): Record<string, any> {
  // Get system field definitions from registry
  const systemFields = getSystemFields(entityScope);

  // Create a map of all valid field names
  const validFieldNames = new Set<string>();

  // Add system field names
  systemFields.forEach((field) => validFieldNames.add(field.name));

  // Add custom field names
  customFields.forEach((field) => validFieldNames.add(field.name));

  // Validate each field in payload
  const validatedFields: Record<string, any> = {};
  const invalidFields: string[] = [];

  for (const [fieldName, value] of Object.entries(payload)) {
    if (validFieldNames.has(fieldName)) {
      // Field is valid - include in output
      validatedFields[fieldName] = value;
    } else {
      // Field is not defined
      invalidFields.push(fieldName);
    }
  }

  // Throw error if any invalid fields were provided
  if (invalidFields.length > 0) {
    throw new Error(
      `Invalid field(s) provided: ${invalidFields.join(', ')}. ` +
      `These fields are not defined as system or custom fields for ${entityScope}.`
    );
  }

  console.log(` Verified ${Object.keys(validatedFields).length} fields for ${entityScope}`);
  return validatedFields;
}

/**
 * Merge contact data with all possible field definitions
 * Used for READ operations to return complete field list
 *
 * @param contactData - Sparse contact data from Firestore
 * @param customFields - Custom field definitions from API
 * @param entityScope - Entity type (default: 'contact')
 * @param groups - Optional array of field groups for metadata merging
 * @returns Array of all fields with values (populated or undefined)
 */
export function mergeCustomFields(
  contactData: Record<string, any>,
  customFields: CustomFieldDefinition[],
  entityScope: 'contact' | 'opportunity' | 'company' | 'deal' = 'contact',
  groups?: FieldGroup[]
): MergedField[] {
  // Get system field definitions from registry
  const systemFields = getSystemFields(entityScope);

  // Build group Map for O(1) lookups
  const groupMap = new Map<string, FieldGroup>();
  if (groups) {
    groups.forEach((group) => {
      groupMap.set(group.name, group);
    });
  }

  // Build merged field list
  const mergedFields: MergedField[] = [];

  // Add system fields with values
  systemFields.forEach((field) => {
    const groupMetadata = field.group ? groupMap.get(field.group) : undefined;
    mergedFields.push({
      name: field.name,
      displayName: field.displayName,
      type: field.type,
      value: contactData[field.name] ?? undefined,
      isSystemField: true,
      hideFromUI: field.hideFromUI,
      group: field.group,
      groupDisplayName: groupMetadata?.displayName,
      groupOrder: groupMetadata?.order ?? 9999, // Ungrouped fields go to end
      order: field.order,
    });
  });

  // Add custom fields with values
  customFields.forEach((field) => {
    const groupMetadata = field.group ? groupMap.get(field.group) : undefined;
    mergedFields.push({
      name: field.name,
      displayName: field.displayName,
      type: field.type,
      value: contactData[field.name] ?? undefined,
      isSystemField: false,
      hideFromUI: field.hideFromUI,
      group: field.group,
      groupDisplayName: groupMetadata?.displayName,
      groupOrder: groupMetadata?.order ?? 9999, // Ungrouped fields go to end
      order: field.order,
    });
  });

  // Sort by group order first, then field order
  mergedFields.sort((a, b) => {
    // System fields always come first
    if (a.isSystemField && !b.isSystemField) return -1;
    if (!a.isSystemField && b.isSystemField) return 1;

    // Then sort by group order
    const groupOrderA = a.groupOrder ?? 9999;
    const groupOrderB = b.groupOrder ?? 9999;
    if (groupOrderA !== groupOrderB) {
      return groupOrderA - groupOrderB;
    }

    // Finally sort by field order within group
    return a.order - b.order;
  });

  console.log(
    `✅ Merged ${mergedFields.length} fields ` +
    `(${systemFields.length} system, ${customFields.length} custom)` +
    (groups ? ` with ${groups.length} groups` : '')
  );

  return mergedFields;
}

/**
 * Get all field definitions (system + custom) as a simple list
 * Useful for orchestrators that need to build field definition lists
 *
 * @param customFields - Custom field definitions from API
 * @param entityScope - Entity type (default: 'contact')
 * @returns Array of all field definitions
 */
export function getAllFieldDefinitions(
  customFields: CustomFieldDefinition[],
  entityScope: 'contact' | 'opportunity' | 'company' | 'deal' = 'contact'
): FieldDefinition[] {
  const systemFields = getSystemFields(entityScope);

  const allFields: FieldDefinition[] = [
    // System fields
    ...systemFields.map((field) => ({
      name: field.name,
      displayName: field.displayName,
      type: field.type,
      isSystemField: true,
    })),
    // Custom fields
    ...customFields.map((field) => ({
      name: field.name,
      displayName: field.displayName,
      type: field.type,
      isSystemField: false,
    })),
  ];

  return allFields;
}

/**
 * ResolveCustomFields class
 * Singleton utility for field resolution
 */
export class ResolveCustomFields {
  /**
   * Verify fields for CREATE/UPDATE operations
   */
  static verify = verifyCustomFields;

  /**
   * Merge fields for READ operations
   */
  static merge = mergeCustomFields;

  /**
   * Get all field definitions
   */
  static getAllDefinitions = getAllFieldDefinitions;
}
