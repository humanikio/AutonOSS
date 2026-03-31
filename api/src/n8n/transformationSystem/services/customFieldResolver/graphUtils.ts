/**
 * Graph Utility Functions for Custom Field Resolver
 *
 * Provides graph analysis algorithms for workflow node graphs:
 * - Topological sort (execution order)
 * - Downstream node detection
 * - Path finding
 * - Ancestor detection
 */

export interface GraphNode {
  id: string;
  type: string;
  data: {
    nodeName?: string;
    [key: string]: any;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  });

  return adjacency;
}

/**
 * Build reverse adjacency list (parents for each node)
 */
function buildReverseAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const reverseAdjacency = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!reverseAdjacency.has(edge.target)) {
      reverseAdjacency.set(edge.target, []);
    }
    reverseAdjacency.get(edge.target)!.push(edge.source);
  });

  return reverseAdjacency;
}

/**
 * Topological Sort - Determine execution order of nodes
 * Uses Kahn's algorithm (BFS-based)
 *
 * @returns Array of node IDs in execution order
 */
export function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adjacency = buildAdjacencyList(edges);
  const inDegree = new Map<string, number>();

  // Initialize in-degree for all nodes
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
  });

  // Calculate in-degree
  edges.forEach((edge) => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Queue for nodes with no incoming edges
  const queue: string[] = [];
  nodes.forEach((node) => {
    if (inDegree.get(node.id) === 0) {
      queue.push(node.id);
    }
  });

  const executionOrder: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    executionOrder.push(nodeId);

    // Reduce in-degree for neighbors
    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach((neighborId) => {
      const newInDegree = (inDegree.get(neighborId) || 0) - 1;
      inDegree.set(neighborId, newInDegree);

      if (newInDegree === 0) {
        queue.push(neighborId);
      }
    });
  }

  // Check for cycles (if executionOrder.length < nodes.length, there's a cycle)
  if (executionOrder.length < nodes.length) {
    console.warn('⚠️  Graph contains cycles - execution order may be incomplete');
  }

  return executionOrder;
}

/**
 * Find all downstream nodes from a given source node
 * Stops at next weighted contact source (FindContact node)
 *
 * @param sourceNodeId - Starting node ID
 * @param executionOrder - Pre-calculated execution order
 * @param weightedSources - Array of contact source node IDs (to stop at)
 * @returns Set of downstream node IDs
 */
export function findDownstreamNodes(
  sourceNodeId: string,
  executionOrder: string[],
  weightedSources: string[]
): Set<string> {
  const downstream = new Set<string>();
  const sourceIndex = executionOrder.indexOf(sourceNodeId);

  if (sourceIndex === -1) {
    console.warn(`Source node ${sourceNodeId} not found in execution order`);
    return downstream;
  }

  // Walk forward through execution order
  for (let i = sourceIndex + 1; i < executionOrder.length; i++) {
    const nodeId = executionOrder[i];

    // If we hit another weighted source (e.g., FindContact node):
    // - Include it in downstream set (so it uses this adapter for its inputs)
    // - Then stop (its outputs will use its own adapter)
    if (weightedSources.includes(nodeId) && nodeId !== sourceNodeId) {
      downstream.add(nodeId); // Include the source node itself - it consumes upstream adapter
      break;
    }

    downstream.add(nodeId);
  }

  return downstream;
}

/**
 * Find all nodes reachable from source using BFS
 * (Alternative to execution-order-based approach)
 *
 * @param sourceNodeId - Starting node
 * @param edges - Graph edges
 * @param stopAtNodes - Optional set of node IDs to stop at
 * @returns Set of reachable node IDs
 */
export function findReachableNodes(
  sourceNodeId: string,
  edges: GraphEdge[],
  stopAtNodes?: Set<string>
): Set<string> {
  const adjacency = buildAdjacencyList(edges);
  const reachable = new Set<string>();
  const queue: string[] = [sourceNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;

    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // Stop at barrier nodes
    if (stopAtNodes && stopAtNodes.has(nodeId) && nodeId !== sourceNodeId) {
      continue;
    }

    reachable.add(nodeId);

    // Add neighbors to queue
    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }

  // Remove the source node itself
  reachable.delete(sourceNodeId);

  return reachable;
}

/**
 * Find the nearest ancestor node of a given type
 * Walks backward through execution order
 *
 * @param nodeId - Target node
 * @param executionOrder - Pre-calculated execution order
 * @param ancestorPredicate - Function to test if node is desired ancestor
 * @returns Ancestor node ID or null
 */
export function findNearestAncestor(
  nodeId: string,
  executionOrder: string[],
  ancestorPredicate: (nodeId: string) => boolean
): string | null {
  const nodeIndex = executionOrder.indexOf(nodeId);

  if (nodeIndex === -1) {
    return null;
  }

  // Walk backward
  for (let i = nodeIndex - 1; i >= 0; i--) {
    const ancestorId = executionOrder[i];
    if (ancestorPredicate(ancestorId)) {
      return ancestorId;
    }
  }

  return null;
}

/**
 * Check if there's a path from source to target
 *
 * @param sourceId - Source node ID
 * @param targetId - Target node ID
 * @param edges - Graph edges
 * @returns true if path exists
 */
export function hasPath(sourceId: string, targetId: string, edges: GraphEdge[]): boolean {
  const reachable = findReachableNodes(sourceId, edges);
  return reachable.has(targetId);
}

/**
 * Get all parent nodes (direct predecessors)
 *
 * @param nodeId - Node ID
 * @param edges - Graph edges
 * @returns Array of parent node IDs
 */
export function getParents(nodeId: string, edges: GraphEdge[]): string[] {
  const reverseAdjacency = buildReverseAdjacencyList(edges);
  return reverseAdjacency.get(nodeId) || [];
}

/**
 * Get all child nodes (direct successors)
 *
 * @param nodeId - Node ID
 * @param edges - Graph edges
 * @returns Array of child node IDs
 */
export function getChildren(nodeId: string, edges: GraphEdge[]): string[] {
  const adjacency = buildAdjacencyList(edges);
  return adjacency.get(nodeId) || [];
}

/**
 * Find all leaf nodes (nodes with no outgoing edges)
 *
 * @param nodes - All nodes
 * @param edges - Graph edges
 * @returns Array of leaf node IDs
 */
export function findLeafNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const adjacency = buildAdjacencyList(edges);
  const leafNodes: string[] = [];

  nodes.forEach((node) => {
    const children = adjacency.get(node.id) || [];
    if (children.length === 0) {
      leafNodes.push(node.id);
    }
  });

  return leafNodes;
}

/**
 * Find root nodes (nodes with no incoming edges - typically triggers)
 *
 * @param nodes - All nodes
 * @param edges - Graph edges
 * @returns Array of root node IDs
 */
export function findRootNodes(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const reverseAdjacency = buildReverseAdjacencyList(edges);
  const rootNodes: string[] = [];

  nodes.forEach((node) => {
    const parents = reverseAdjacency.get(node.id) || [];
    if (parents.length === 0) {
      rootNodes.push(node.id);
    }
  });

  return rootNodes;
}
