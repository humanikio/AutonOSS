/**
 * Contact Field Resolver
 *
 * Resolves {{$contact.*}} placeholders in node parameters during compilation.
 * This is called per-node during the compilation phase (batched processing).
 */

import type { ReactFlowNode } from '../../transformationMethodRegistry/types/transformationMethodTypes';

// Regex to match contact field placeholders
const CONTACT_FIELD_REGEX = /\{\{\$contact\.([a-zA-Z0-9_]+)\}\}/g;

/**
 * Resolve contact field placeholders in a single node's parameters
 *
 * Replaces {{$contact.fieldName}} with ={{ $("adapterNodeId").item.json.fieldName }}
 *
 * @param node - ReactFlow node to process
 * @param adapterNodeId - ID of the contact adapter node this node should reference
 * @returns Node with resolved contact field references
 */
export function resolveContactFields(
  node: ReactFlowNode,
  adapterNodeId: string | undefined
): ReactFlowNode {
  // Skip if no adapter mapping (node doesn't use contact fields)
  if (!adapterNodeId) {
    return node;
  }

  // Skip adapter nodes themselves (they don't reference other adapters)
  if (node.type === 'adapter' || node.data?._isAdapter) {
    return node;
  }

  // Recursively resolve parameters
  const resolvedParameters = resolveParametersRecursive(
    node.data?.parameters || {},
    adapterNodeId
  );

  return {
    ...node,
    data: {
      ...node.data,
      parameters: resolvedParameters,
    },
  };
}

/**
 * Recursively scan and replace contact field placeholders
 *
 * Handles strings, arrays, and nested objects
 *
 * @param obj - Object/array/string to scan
 * @param adapterNodeId - Adapter node ID to reference
 * @returns Resolved object with placeholders replaced
 */
function resolveParametersRecursive(
  obj: any,
  adapterNodeId: string
): any {
  // String: Replace contact field placeholders
  if (typeof obj === 'string') {
    return obj.replace(CONTACT_FIELD_REGEX, (match, fieldName) => {
      // Replace with n8n expression referencing adapter node
      // {{$contact.phoneNumber}} → ={{ $("contactAdapter-X").item.json.phoneNumber }}
      return `={{ $("${adapterNodeId}").item.json.${fieldName} }}`;
    });
  }

  // Array: Recursively process each element
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveParametersRecursive(item, adapterNodeId));
  }

  // Object: Recursively process each property
  if (obj && typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveParametersRecursive(value, adapterNodeId);
    }
    return resolved;
  }

  // Primitive values: Return as-is
  return obj;
}
