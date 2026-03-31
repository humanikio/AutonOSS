/**
 * Topological Sort Utility
 *
 * Sorts ReactFlow nodes based on their edge connections to determine execution order.
 * Uses Kahn's algorithm for topological sorting.
 */

import type { ReactFlowNode, ReactFlowEdge } from '../transformationMethodRegistry/types/transformationMethodTypes';

/**
 * Performs topological sort on ReactFlow nodes based on edges
 *
 * @param nodes - Array of ReactFlow nodes
 * @param edges - Array of ReactFlow edges
 * @returns Nodes sorted in execution order (dependencies first)
 */
export function topologicalSort(
  nodes: ReactFlowNode[],
  edges: ReactFlowEdge[]
): ReactFlowNode[] {
  // Build adjacency list and track in-degrees
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodeMap = new Map<string, ReactFlowNode>();

  // Initialize graph
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
    nodeMap.set(node.id, node);
  });

  // Build edges
  edges.forEach(edge => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn's algorithm: Start with nodes that have no incoming edges
  const queue: string[] = [];
  const sorted: string[] = [];

  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);

    // Reduce in-degree for neighbors
    const neighbors = graph.get(nodeId) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  // Check for cycles
  if (sorted.length !== nodes.length) {
    throw new Error(
      `Cycle detected in workflow graph. Sorted ${sorted.length} nodes but expected ${nodes.length}.`
    );
  }

  // Convert sorted IDs back to nodes
  return sorted
    .map(id => nodeMap.get(id))
    .filter(Boolean) as ReactFlowNode[];
}
