/**
 * Expression Helpers for n8n Transformations
 *
 * Utilities for handling n8n expressions in transformation methods
 */

import type { HttpRequestBodyParameter } from '../n8n/nodeSchemas/HttpRequest.schema';

/**
 * Checks if a string value is an n8n expression
 *
 * n8n expressions start with `={{` or `{{` and end with `}}`
 *
 * @param value - The value to check
 * @returns True if the value is an n8n expression
 */
export function isExpression(value: any): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('={{') || trimmed.startsWith('{{');
}

/**
 * Unwraps an n8n expression by removing the outer `={{` and `}}` wrappers
 *
 * This is CRITICAL when embedding expressions inside object literals.
 * n8n expressions cannot be nested, so when building `={{ { field: expr } }}`,
 * the inner expr must be unwrapped JavaScript, not another expression.
 *
 * Examples:
 * - `={{ $json.contactId }}` → `$json.contactId`
 * - `{{$json.field}}` → `$json.field`
 * - `literal value` → `literal value` (no change)
 *
 * @param value - The n8n expression to unwrap
 * @returns The inner JavaScript expression without wrappers
 */
export function unwrapExpression(value: any): string {
  const s = String(value).trim();

  if (s.startsWith('={{')) {
    // Remove ={{ and }}
    return s.slice(3, -2).trim();
  } else if (s.startsWith('{{')) {
    // Remove {{ and }}
    return s.slice(2, -2).trim();
  }

  // Not an expression, return as-is
  return s;
}

/**
 * Normalizes n8n expressions to ensure proper evaluation
 *
 * n8n requires expressions to start with = for evaluation:
 * - `={{$json.field}}` → `={{$json.field}}` (already correct)
 * - `{{$json.field}}` → `={{$json.field}}` (add =)
 * - `literal value` → `literal value` (no change)
 *
 * @param value - The value to normalize
 * @returns Normalized expression string
 */
export function normalizeExpression(value: any): string {
  const s = String(value).trim();
  if (isExpression(s)) {
    return s.startsWith('={{') ? s : '=' + s;
  }
  return s;
}

/**
 * Builds an n8n object expression from field pairs
 *
 * Converts an array of {name, value} pairs into a single n8n object expression.
 * This properly unwraps inner expressions to avoid nested `={{` syntax errors.
 *
 * Examples:
 * Input: [
 *   { name: 'contactId', value: '={{ $json.contactId }}' },
 *   { name: 'status', value: 'active' }
 * ]
 * Output: '={{ { "contactId": $json.contactId, "status": "active" } }}'
 *
 * IMPORTANT: When embedding expressions, they must be UNWRAPPED.
 * WRONG: `={{ { "id": ={{ $json.id }} } }}`  (nested expressions = INVALID)
 * RIGHT: `={{ { "id": $json.id } }}`         (unwrapped expression = VALID)
 *
 * @param fields - Array of {name, value} field pairs
 * @param fallback - Fallback value if no fields provided (default: '={{ $json }}')
 * @returns n8n object expression string
 */
export function buildN8nObjectExpression(
  fields: Array<{ name: string; value: any }>,
  fallback: string = '={{ $json }}'
): string {
  if (!Array.isArray(fields) || fields.length === 0) {
    return fallback;
  }

  const fieldExpressions: string[] = [];

  fields.forEach((field) => {
    if (!field.name || field.value === undefined) return;

    const name = field.name;
    const value = String(field.value);

    if (isExpression(value)) {
      // Expression - unwrap and use without quotes
      const unwrapped = unwrapExpression(value);
      fieldExpressions.push(`"${name}": ${unwrapped}`);
    } else {
      // Static value - wrap in quotes
      // Escape any double quotes in the value
      const escaped = value.replace(/"/g, '\\"');
      fieldExpressions.push(`"${name}": "${escaped}"`);
    }
  });

  // Build the complete n8n object expression
  return `={{ { ${fieldExpressions.join(', ')} } }}`;
}

/**
 * Builds body parameters array from a key-value object
 *
 * Converts an object into an array of {name, value} pairs where
 * each value is individually evaluated by n8n.
 *
 * This is the correct approach for n8n HTTP Request nodes using
 * keypair mode, as opposed to stringifying the entire object.
 *
 * @param bodyObj - Object with field names and values
 * @returns Array of body parameters for n8n
 */
export function buildBodyParameters(bodyObj: Record<string, any>): HttpRequestBodyParameter[] {
  const parameters: HttpRequestBodyParameter[] = [];

  Object.entries(bodyObj).forEach(([name, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      parameters.push({
        name,
        value: normalizeExpression(value),
      });
    }
  });

  return parameters;
}
