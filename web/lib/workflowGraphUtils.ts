/**
 * Workflow Graph Utilities
 * Helper functions for traversing and analyzing workflow node graphs
 */

import { Node, Edge } from '@xyflow/react';

/**
 * Finds all nodes that come before a target node in the workflow execution path
 * Uses recursive depth-first search to traverse backwards through the graph
 *
 * @param targetNodeId - The node ID to find predecessors for
 * @param allNodes - All nodes in the workflow
 * @param allEdges - All edges in the workflow
 * @returns Array of nodes that execute before the target node
 */
export function findPreviousNodes(
  targetNodeId: string,
  allNodes: Node[],
  allEdges: Edge[]
): Node[] {
  const previousNodeIds = new Set<string>();
  const visited = new Set<string>();

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges that point TO this node (incoming edges)
    const incomingEdges = allEdges.filter(e => e.target === nodeId);

    incomingEdges.forEach(edge => {
      // Add the source node as a predecessor
      previousNodeIds.add(edge.source);
      // Recursively traverse to find all upstream nodes
      traverse(edge.source);
    });
  }

  // Start traversal from target node
  traverse(targetNodeId);

  // Convert node IDs to actual node objects and return
  return allNodes.filter(n => previousNodeIds.has(n.id));
}

/**
 * Checks if a node is a trigger node (has no inputs)
 *
 * @param nodeId - The node ID to check
 * @param allEdges - All edges in the workflow
 * @returns True if the node has no incoming edges
 */
export function isTriggerNode(nodeId: string, allEdges: Edge[]): boolean {
  return !allEdges.some(e => e.target === nodeId);
}

/**
 * Gets the execution order of nodes in a workflow
 * Uses topological sort to determine execution sequence
 *
 * @param allNodes - All nodes in the workflow
 * @param allEdges - All edges in the workflow
 * @returns Array of nodes in execution order
 */
export function getExecutionOrder(allNodes: Node[], allEdges: Edge[]): Node[] {
  const order: Node[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      // Cycle detected - skip for now
      console.warn('Cycle detected in workflow at node:', nodeId);
      return;
    }

    visiting.add(nodeId);

    // Visit all predecessor nodes first
    const incomingEdges = allEdges.filter(e => e.target === nodeId);
    incomingEdges.forEach(edge => {
      visit(edge.source);
    });

    visiting.delete(nodeId);
    visited.add(nodeId);

    const node = allNodes.find(n => n.id === nodeId);
    if (node) {
      order.push(node);
    }
  }

  // Start with all nodes and visit them
  allNodes.forEach(node => {
    visit(node.id);
  });

  return order;
}

/**
 * Finds the direct parent nodes of a target node
 * (Only immediate predecessors, not all ancestors)
 *
 * @param targetNodeId - The node ID to find parents for
 * @param allNodes - All nodes in the workflow
 * @param allEdges - All edges in the workflow
 * @returns Array of immediate parent nodes
 */
export function getDirectParents(
  targetNodeId: string,
  allNodes: Node[],
  allEdges: Edge[]
): Node[] {
  const incomingEdges = allEdges.filter(e => e.target === targetNodeId);
  const parentIds = incomingEdges.map(e => e.source);
  return allNodes.filter(n => parentIds.includes(n.id));
}
