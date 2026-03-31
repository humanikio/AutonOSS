/**
 * Formats and flattens the payload from 11Labs to match workflow input format
 * Ensures payload is a flat key-value object like the test workflow panel
 *
 * Example input from 11Labs:
 * {
 *   "contactId": "abc-123",
 *   "message": "Hello"
 * }
 *
 * Example output:
 * {
 *   contactId: "abc-123",
 *   message: "Hello"
 * }
 *
 * @param payload - Raw payload from 11Labs
 * @returns Flattened payload ready for workflow execution
 */
export const formatPayload = (payload: any): Record<string, any> => {
  // If payload is null, undefined, or not an object, return empty object
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    console.warn('Invalid payload format, returning empty object:', payload);
    return {};
  }

  // Flatten nested objects to single level
  const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        // Keep primitives, arrays, and null values as-is
        flattened[newKey] = value;
      }
    }

    return flattened;
  };

  const formattedPayload = flattenObject(payload);

  console.log('=æ Formatted payload:', formattedPayload);

  return formattedPayload;
};
