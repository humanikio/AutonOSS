/**
 * Replacement Helper Utilities
 *
 * Helper functions for creating node replacement mappings in transformations.
 * Use these when a single ReactFlow node expands into multiple n8n nodes.
 */

import type { ReplacementMap } from '../types/transformationMethodTypes';

/**
 * Create replacement mapping for a node chain transformation
 *
 * Use when: Transforming 1 ReactFlow node → N n8n nodes in a sequential chain
 * Example: wait → Set + HTTP + Wait
 *
 * @param originalNodeId - ReactFlow node ID being replaced (e.g., "action-123-case0")
 * @param firstNodeId - ID of first node in n8n chain (receives incoming edges)
 * @param lastNodeId - ID of last node in n8n chain (sends outgoing edges)
 * @returns ReplacementMap for this transformation
 *
 * @example
 * ```typescript
 * const id = "action-123-case0";
 * const setNodeId = `set_${id}`;
 * const httpNodeId = `http_${id}`;
 * const waitNodeId = `wait_${id}`;
 *
 * return {
 *   nodes: [setNode, httpNode, waitNode],
 *   replacements: createChainReplacement(id, setNodeId, waitNodeId),
 *   internalEdges: [
 *     { from: setNodeId, to: httpNodeId },
 *     { from: httpNodeId, to: waitNodeId }
 *   ]
 * }
 * ```
 */
export function createChainReplacement(
  originalNodeId: string,
  firstNodeId: string,
  lastNodeId: string
): ReplacementMap {
  return {
    [originalNodeId]: {
      incomingTarget: firstNodeId,
      outgoingSource: lastNodeId
    }
  };
}

/**
 * Create replacement mapping for a simple 1:1 node replacement
 *
 * Use when: Transforming 1 ReactFlow node → 1 n8n node with a DIFFERENT ID
 * Example: contactAdapter-123 → contactAdapter-123 (same ID, so not needed)
 *          wait-123 → webhook-wait-123 (different ID, replacement needed)
 *
 * @param originalNodeId - ReactFlow node ID being replaced
 * @param newNodeId - New n8n node ID
 * @returns ReplacementMap for this transformation
 *
 * @example
 * ```typescript
 * return {
 *   nodes: [newNode],
 *   replacements: createSimpleReplacement(node.id, newNode.id)
 * }
 * ```
 */
export function createSimpleReplacement(
  originalNodeId: string,
  newNodeId: string
): ReplacementMap {
  return {
    [originalNodeId]: {
      incomingTarget: newNodeId,
      outgoingSource: newNodeId
    }
  };
}

/**
 * Merge multiple replacement maps into one
 *
 * Use when: A transformation creates multiple node chains that need separate replacements
 *
 * @param maps - Array of ReplacementMaps to merge
 * @returns Combined ReplacementMap
 *
 * @example
 * ```typescript
 * const replacement1 = createChainReplacement("node1", "first1", "last1");
 * const replacement2 = createChainReplacement("node2", "first2", "last2");
 * return {
 *   nodes: [...nodes1, ...nodes2],
 *   replacements: mergeReplacements([replacement1, replacement2])
 * }
 * ```
 */
export function mergeReplacements(...maps: ReplacementMap[]): ReplacementMap {
  return Object.assign({}, ...maps);
}
