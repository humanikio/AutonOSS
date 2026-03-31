/**
 * Edge Rewiring Utilities
 *
 * Helper functions for managing edges during subflow creation:
 * - Connecting switch node to group entry points
 * - Connecting group exit points to continuation nodes
 * - Removing original linear path edges
 * - Creating new edges with proper IDs
 */

import type { ReactFlowEdge, ReactFlowNode } from '../../../../transformationMethodRegistry/types/transformationMethodTypes';
import type { SubflowGroup } from '../subflowMethods/groupingRules/milestoneWait';

/**
 * Create edges from switch node outputs to group entry points
 *
 * Each switch case routes to the first node in its corresponding group.
 *
 * @param switchNodeId - ID of the switch/determination node
 * @param groups - Array of subflow groups
 * @returns Array of edges connecting switch to groups
 */
export function createSwitchToGroupEdges(
  switchNodeId: string,
  groups: SubflowGroup[]
): ReactFlowEdge[] {
  const edges: ReactFlowEdge[] = [];

  groups.forEach(group => {
    if (group.nodes.length === 0) {
      console.warn(`�  Group ${group.groupIndex} has no nodes - skipping edge creation`);
      return;
    }

    const firstNodeId = group.nodes[0].id;

    edges.push({
      id: `${switchNodeId}-to-${firstNodeId}`,
      source: switchNodeId,
      target: firstNodeId,
      sourceHandle: `output_${group.groupIndex}`, // Switch output for this case
    });
  });

  console.log(`   = Created ${edges.length} switch-to-group edges`);
  return edges;
}

/**
 * Create edges from group exit points to continuation node
 *
 * All groups converge at the node that was immediately after the linear path.
 *
 * @param groups - Array of subflow groups
 * @param continuationNodeId - ID of the node after the linear path (or null if terminal)
 * @returns Array of edges connecting group exits to continuation
 */
export function createGroupToContinuationEdges(
  groups: SubflowGroup[],
  continuationNodeId: string | null
): ReactFlowEdge[] {
  if (!continuationNodeId) {
    console.log(`   9  No continuation node - groups are terminal`);
    return [];
  }

  const edges: ReactFlowEdge[] = [];

  groups.forEach(group => {
    if (group.nodes.length === 0) {
      return;
    }

    const lastNodeId = group.nodes[group.nodes.length - 1].id;

    edges.push({
      id: `${lastNodeId}-to-${continuationNodeId}`,
      source: lastNodeId,
      target: continuationNodeId,
    });
  });

  console.log(`   = Created ${edges.length} group-to-continuation edges`);
  return edges;
}

/**
 * Find edges within the original linear path that should be removed
 *
 * These are edges between nodes in the path before duplication.
 *
 * @param pathNodes - Original nodes in the linear path
 * @param allEdges - All edges in the workflow
 * @returns Array of edge IDs to remove
 */
export function findEdgesToRemove(
  pathNodes: ReactFlowNode[],
  allEdges: ReactFlowEdge[]
): string[] {
  const nodeIds = new Set(pathNodes.map(n => n.id));
  const edgesToRemove: string[] = [];

  allEdges.forEach(edge => {
    // Remove edge if both source and target are in the path
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      edgesToRemove.push(edge.id);
    }
  });

  console.log(`   =�  Found ${edgesToRemove.length} edges to remove from original path`);
  return edgesToRemove;
}

/**
 * Find edges leading into the linear path (to be rewired to switch)
 *
 * @param pathNodes - Original nodes in the linear path
 * @param allEdges - All edges in the workflow
 * @returns Array of edges entering the path
 */
export function findIncomingEdges(
  pathNodes: ReactFlowNode[],
  allEdges: ReactFlowEdge[]
): ReactFlowEdge[] {
  const nodeIds = new Set(pathNodes.map(n => n.id));
  const firstNodeId = pathNodes[0]?.id;

  if (!firstNodeId) {
    return [];
  }

  // Find edges that target the first node in the path
  const incomingEdges = allEdges.filter(edge =>
    edge.target === firstNodeId && !nodeIds.has(edge.source)
  );

  console.log(`   =� Found ${incomingEdges.length} incoming edges to path`);
  return incomingEdges;
}

/**
 * Rewire incoming edges to point to switch node instead of original path
 *
 * @param incomingEdges - Edges that originally targeted the path entry
 * @param switchNodeId - ID of the new switch node
 * @returns Modified edges pointing to switch node
 */
export function rewireIncomingEdges(
  incomingEdges: ReactFlowEdge[],
  switchNodeId: string
): ReactFlowEdge[] {
  return incomingEdges.map(edge => ({
    ...edge,
    target: switchNodeId,
    id: `${edge.source}-to-${switchNodeId}`, // Update edge ID
  }));
}

/**
 * Find the continuation node (first node after the linear path)
 *
 * @param pathNodes - Nodes in the linear path
 * @param allEdges - All edges in the workflow
 * @returns ID of continuation node, or null if path is terminal
 */
export function findContinuationNode(
  pathNodes: ReactFlowNode[],
  allEdges: ReactFlowEdge[]
): string | null {
  const pathNodeIds = new Set(pathNodes.map(n => n.id));
  const lastNodeId = pathNodes[pathNodes.length - 1]?.id;

  if (!lastNodeId) {
    return null;
  }

  // Find edges leaving the last node in the path
  const outgoingEdges = allEdges.filter(edge =>
    edge.source === lastNodeId && !pathNodeIds.has(edge.target)
  );

  if (outgoingEdges.length === 0) {
    console.log(`   9  Path is terminal (no continuation node)`);
    return null;
  }

  if (outgoingEdges.length > 1) {
    console.warn(`   �  Multiple outgoing edges from path - using first target`);
  }

  const continuationNodeId = outgoingEdges[0].target;
  console.log(`   �  Continuation node: ${continuationNodeId}`);
  return continuationNodeId;
}

/**
 * Remove edges by ID from edge array
 *
 * @param edges - All edges
 * @param idsToRemove - Edge IDs to remove
 * @returns Filtered edge array
 */
export function removeEdges(
  edges: ReactFlowEdge[],
  idsToRemove: string[]
): ReactFlowEdge[] {
  const removeSet = new Set(idsToRemove);
  return edges.filter(edge => !removeSet.has(edge.id));
}

/**
 * Validate edge connectivity
 *
 * Ensures all edges reference valid node IDs.
 *
 * @param edges - Edges to validate
 * @param nodes - All nodes in the workflow
 * @returns Validation result with errors
 */
export function validateEdges(
  edges: ReactFlowEdge[],
  nodes: ReactFlowNode[]
): { valid: boolean; errors: string[] } {
  const nodeIds = new Set(nodes.map(n => n.id));
  const errors: string[] = [];

  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id} has invalid source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} has invalid target: ${edge.target}`);
    }
  });

  if (errors.length > 0) {
    console.error(`   L Edge validation failed with ${errors.length} errors`);
  } else {
    console.log(`    Edge validation passed (${edges.length} edges)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
