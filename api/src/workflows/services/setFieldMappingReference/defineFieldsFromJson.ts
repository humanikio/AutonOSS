export interface FieldDefinition {
  path: string;
  displayName: string;
  group: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  value: any;
  isNested: boolean;
}

/**
 * Determines the group for a given field path
 * All webhook payload fields go into the 'inboundWebhook' group
 */
function determineGroup(): string {
  return 'inboundWebhook';
}

/**
 * Extracts display name from path (last segment)
 * Example: "customFields.industry" -> "industry"
 */
function getDisplayName(path: string): string {
  // Remove array notation
  const cleanPath = path.replace(/\[\d+\]/g, '');

  // Get last segment after final dot
  const segments = cleanPath.split('.');
  return segments[segments.length - 1];
}

/**
 * Recursively flattens a JSON object into field definitions with dot-notation paths
 *
 * @param payload - The JSON payload to analyze
 * @returns Array of field definitions with paths, types, and sample values
 */
export function defineFieldsFromJson(payload: any): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  function getType(value: any): FieldDefinition['type'] {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }

  function flatten(obj: any, prefix: string = ''): void {
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      const value = obj[key];
      const path = prefix ? `${prefix}.${key}` : key;
      const type = getType(value);
      const isNested = prefix.length > 0;

      // Always add the field definition
      fields.push({
        path,
        displayName: getDisplayName(path),
        group: determineGroup(),
        type,
        value,
        isNested,
      });

      // If object (but not array or null), recursively flatten
      if (type === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, path);
      }

      // If array, add individual element paths (for first element as example)
      if (type === 'array' && value.length > 0) {
        const firstElement = value[0];
        if (typeof firstElement === 'object' && firstElement !== null && !Array.isArray(firstElement)) {
          // If array of objects, flatten the first object as [0].field
          flatten(firstElement, `${path}[0]`);
        } else {
          // If array of primitives, just note the array type
          const arrayPath = `${path}[0]`;
          fields.push({
            path: arrayPath,
            displayName: getDisplayName(arrayPath),
            group: determineGroup(),
            type: getType(firstElement),
            value: firstElement,
            isNested: true,
          });
        }
      }
    }
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Payload must be a valid JSON object');
  }

  flatten(payload);

  // Sort by path for consistent ordering
  fields.sort((a, b) => a.path.localeCompare(b.path));

  return fields;
}
