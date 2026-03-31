/**
 * Contact Custom Fields Resolver
 *
 * ⚠️ LEGACY FILE - NO LONGER USED ⚠️
 * This file has been replaced by per-node field resolution during compilation.
 *
 * New file: /services/transform2N8n/resolveContactFields.ts
 * - Resolves fields ONE node at a time (batched processing)
 * - Called during compilation phase for each transformation task
 *
 * Kept for reference and potential rollback only.
 *
 * ===== OLD DOCUMENTATION BELOW =====
 *
 * Scans workflow node parameters recursively and replaces contact field placeholders
 * with n8n expressions that reference the appropriate contact adapter node.
 *
 * Placeholder syntax: {{$contact.fieldName}}
 * Resolved expression: ={{ $("contactAdapter-X").item.json.fieldName }}
 *
 * Note: The adapter calls /api/contacts/:id/flattened which returns fields as simple key-value pairs
 * instead of an array, so n8n can access them with simple property paths
 * (e.g., json.phoneNumber instead of json.contact.fields.find(...).value)
 *
 * This resolver:
 * 1. Recursively scans all node parameters (strings, arrays, objects)
 * 2. Detects {{$contact.*}} placeholders
 * 3. Replaces with expressions referencing the correct adapter (based on adapterMap)
 */

import { ReactFlowNode } from './injectContactFieldAdapter';

// Regex to match contact field placeholders
const CONTACT_FIELD_REGEX = /\{\{\$contact\.([a-zA-Z0-9_]+)\}\}/g;

/**
 * Resolve contact field placeholders in all nodes
 *
 * @param nodes - Workflow nodes (after adapter injection)
 * @param adapterMap - Map of nodeId → adapterNodeId
 * @returns Nodes with resolved field references
 */
export async function resolveContactCustomFields(
  nodes: ReactFlowNode[],
  adapterMap: Map<string, string>
): Promise<ReactFlowNode[]> {
  console.log('🔍 Resolving contact field placeholders...');
  console.log(`   📊 Input: ${nodes.length} nodes, ${adapterMap.size} adapter mappings`);

  let totalReplacements = 0;

  const resolvedNodes = nodes.map((node) => {
    // Skip adapter nodes themselves
    if (node.type === 'adapter' || node.data._isAdapter) {
      return node;
    }

    // Get which adapter this node should reference
    const adapterNodeId = adapterMap.get(node.id);

    if (!adapterNodeId) {
      // No adapter mapped - node doesn't have access to contact fields
      // Just return as-is (might not use contact fields)
      return node;
    }

    console.log(`   🔧 Processing node: ${node.id} (uses adapter: ${adapterNodeId})`);

    // Track replacements for this node
    let nodeReplacements = 0;

    // Recursively scan and replace in parameters
    const resolvedParameters = resolveParametersRecursive(
      node.data.parameters || {},
      adapterNodeId,
      (match, fieldName) => {
        nodeReplacements++;
        totalReplacements++;
        console.log(`      ✅ Replaced: {{$contact.${fieldName}}} → ={{ $("${adapterNodeId}").item.json.${fieldName} }}`);
      }
    );

    if (nodeReplacements > 0) {
      console.log(`      📊 ${nodeReplacements} replacements in ${node.id}`);
    }

    return {
      ...node,
      data: {
        ...node.data,
        parameters: resolvedParameters,
      },
    };
  });

  console.log(`   ✅ Contact field resolution complete: ${totalReplacements} total replacements`);

  return resolvedNodes;
}

/**
 * Recursively scan and replace contact field placeholders
 *
 * @param obj - Object/array/string to scan
 * @param adapterNodeId - Adapter node ID to reference
 * @param onReplace - Callback when a replacement is made
 * @returns Resolved object with placeholders replaced
 */
function resolveParametersRecursive(
  obj: any,
  adapterNodeId: string,
  onReplace?: (match: string, fieldName: string) => void
): any {
  // String: Replace contact field placeholders
  if (typeof obj === 'string') {
    return obj.replace(CONTACT_FIELD_REGEX, (match, fieldName) => {
      if (onReplace) {
        onReplace(match, fieldName);
      }

      // Replace with n8n expression referencing adapter node
      // Note: The adapter uses /flattened endpoint that returns simple key-value pairs
      // API response: { success: true, contactId: "...", phoneNumber: "...", name: "..." }
      // Using modern n8n syntax: $("NodeName").item.json.fieldName
      // {{$contact.phoneNumber}} → ={{ $("contactAdapter-X").item.json.phoneNumber }}
      return `={{ $("${adapterNodeId}").item.json.${fieldName} }}`;
    });
  }

  // Array: Recursively process each element
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveParametersRecursive(item, adapterNodeId, onReplace));
  }

  // Object: Recursively process each property
  if (obj && typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveParametersRecursive(value, adapterNodeId, onReplace);
    }
    return resolved;
  }

  // Primitive values: Return as-is
  return obj;
}

/**
 * Check if a string contains contact field placeholders
 *
 * @param str - String to check
 * @returns true if contains {{$contact.*}} placeholders
 */
export function hasContactFieldPlaceholders(str: string): boolean {
  return CONTACT_FIELD_REGEX.test(str);
}

/**
 * Extract all contact field names from a string
 *
 * @param str - String to scan
 * @returns Array of field names
 */
export function extractContactFieldNames(str: string): string[] {
  const fieldNames: string[] = [];
  const matches = str.matchAll(CONTACT_FIELD_REGEX);

  for (const match of matches) {
    if (match[1]) {
      fieldNames.push(match[1]);
    }
  }

  return fieldNames;
}
