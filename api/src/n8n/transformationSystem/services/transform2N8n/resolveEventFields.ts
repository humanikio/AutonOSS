/**
 * Event Field Resolver
 *
 * Resolves {{$event.*}} placeholders in node parameters during compilation.
 * Similar to contact field resolution but specifically for event-related fields from webhook triggers.
 *
 * Webhook triggers receive POST data under $json.body, so event fields resolve to:
 * {{$event.eventId}} → ={{ $("triggerNodeId").item.json.body.eventId }}
 * {{$event.eventData.startTime}} → ={{ $("triggerNodeId").item.json.body.eventData.startTime }}
 */

import type { ReactFlowNode } from '../../transformationMethodRegistry/types/transformationMethodTypes';

// Regex to match event field placeholders: {{$event.fieldName}} or ={{$event.nested.path}}
// Supports both flat fields (eventId) and nested paths (eventData.startTime)
const EVENT_FIELD_REGEX = /=?\{\{\$event\.([a-zA-Z0-9_.]+)\}\}/g;

/**
 * Resolve event field placeholders in a single node's parameters
 *
 * Replaces {{$event.fieldName}} with ={{ $("triggerNodeId").item.json.body.fieldName }}
 * Supports nested paths: {{$event.eventData.startTime}} → ={{ $("triggerNodeId").item.json.body.eventData.startTime }}
 *
 * @param node - ReactFlow node to process
 * @param triggerNodeId - ID of the trigger node this node should reference
 * @returns Node with resolved event field references
 */
export function resolveEventFields(
  node: ReactFlowNode,
  triggerNodeId: string | undefined
): ReactFlowNode {
  // Skip if no trigger (shouldn't happen, but guard against it)
  if (!triggerNodeId) {
    console.warn(`⚠️  No trigger node found for event field resolution in node ${node.id}`);
    return node;
  }

  // Skip trigger nodes themselves
  if (node.type === 'trigger') {
    return node;
  }

  // Recursively resolve parameters
  const resolvedParameters = resolveParametersRecursive(
    node.data?.parameters || {},
    triggerNodeId
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
 * Recursively scan and replace event field placeholders
 *
 * Handles strings, arrays, and nested objects
 *
 * @param obj - Object/array/string to scan
 * @param triggerNodeId - Trigger node ID to reference
 * @returns Resolved object with placeholders replaced
 */
function resolveParametersRecursive(
  obj: any,
  triggerNodeId: string
): any {
  // String: Replace event field placeholders
  if (typeof obj === 'string') {
    return obj.replace(EVENT_FIELD_REGEX, (match, fieldPath) => {
      // Replace with n8n expression referencing trigger node
      // ={{$event.eventId}} → ={{ $("trigger-123").item.json.body.eventId }}
      // {{$event.eventData.startTime}} → {{ $("trigger-123").item.json.body.eventData.startTime }}
      const hasEquals = match.startsWith('=');
      const expression = `{{ $("${triggerNodeId}").item.json.body.${fieldPath} }}`;
      return hasEquals ? `=${expression}` : expression;
    });
  }

  // Array: Recursively process each element
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveParametersRecursive(item, triggerNodeId));
  }

  // Object: Recursively process each property
  if (obj && typeof obj === 'object') {
    const resolved: any = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveParametersRecursive(value, triggerNodeId);
    }
    return resolved;
  }

  // Primitive values: Return as-is
  return obj;
}
